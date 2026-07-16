import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
import { isR2Configured } from "@/lib/system-status";
import { matchesAudioSignature, matchesImageSignature, SUPPORTED_AUDIO_MIME_TYPES } from "@/lib/settings/media-validation";
import { getSiteAssetPublicUrl } from "@/lib/site-assets";

const acceptedInputMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const limits = {
  avatar: { width: 4096, height: 4096, pixels: 16_000_000 },
  logo: { width: 2400, height: 1200, pixels: 8_000_000 },
  favicon: { width: 512, height: 512, pixels: 1_000_000 },
  cover: { width: 3840, height: 2160, pixels: 16_000_000 },
} as const;

export type UploadedSiteAsset = {
  url: string;
  key: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  mimeType: "image/webp";
};

export type UploadedSiteAudioAsset = {
  url: string;
  key: string;
  sha256: string;
  bytes: number;
  mimeType: (typeof SUPPORTED_AUDIO_MIME_TYPES)[number];
};

export type StoredSiteAsset = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  cacheControl: string;
};

export async function uploadSiteAsset(file: File, kind: "logo" | "favicon" | "cover" | "avatar", allowedMimeTypes: string[], maxMb: number, options: { organizeByDate?: boolean } = {}) {
  if (!isR2Configured()) throw new Error("Cloudflare R2 yapılandırılmamış.");
  if (!allowedMimeTypes.includes(file.type) || !acceptedInputMimeTypes.has(file.type)) throw new Error("Yalnızca PNG, JPEG veya WebP görseller yüklenebilir.");
  if (file.size < 1 || file.size > maxMb * 1024 * 1024) throw new Error(`Dosya en fazla ${maxMb} MB olabilir.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesImageSignature(bytes, file.type)) throw new Error("Dosya içeriği bildirilen görsel türüyle eşleşmiyor.");

  const limit = limits[kind];
  const dimensions = readImageDimensions(bytes, file.type);
  if (!dimensions || dimensions.width * dimensions.height > limit.pixels) throw new Error("Görsel çözümlenemedi veya piksel sınırını aşıyor.");
  if (dimensions.width > limit.width || dimensions.height > limit.height) throw new Error(`Görsel en fazla ${limit.width}×${limit.height} piksel olabilir.`);
  if (isAnimatedImage(bytes, file.type)) throw new Error("Animasyonlu görseller desteklenmiyor.");
  let outputBytes: Uint8Array;
  try {
    const image = sharp(bytes, { animated: false, failOn: "error", limitInputPixels: limit.pixels });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width !== dimensions.width || metadata.height !== dimensions.height) {
      throw new Error("Görsel boyut bilgisi tutarsız.");
    }
    if ((metadata.pages ?? 1) > 1) throw new Error("Animasyonlu görseller desteklenmiyor.");
    outputBytes = new Uint8Array(await image.rotate().webp({ quality: kind === "favicon" ? 90 : 82 }).toBuffer());
  } catch (error) {
    if (error instanceof Error && (error.message.includes("boyut") || error.message.includes("Animasyonlu"))) throw error;
    throw new Error("Görsel güvenli biçimde yeniden kodlanamadı.");
  }

  const sha256 = createHash("sha256").update(outputBytes).digest("hex");
  const keyPrefix = options.organizeByDate ? `site-assets/${kind}/${datePath(new Date())}` : `site-assets/${kind}`;
  const key = `${keyPrefix}/${sha256.slice(0, 16)}-${randomUUID()}.webp`;
  await putObject(key, outputBytes, "image/webp");
  return {
    url: getSiteAssetPublicUrl(key),
    key,
    sha256,
    bytes: outputBytes.byteLength,
    width: dimensions.width,
    height: dimensions.height,
    mimeType: "image/webp" as const,
  };
}

function datePath(date: Date) {
  return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function uploadSiteAudioAsset(file: File, maxMb: number): Promise<UploadedSiteAudioAsset> {
  if (!isR2Configured()) throw new Error("Cloudflare R2 yapılandırılmamış.");
  if (!isSupportedAudioMimeType(file.type)) throw new Error("Yalnızca MP3, WAV, OGG veya WebM ses dosyaları yüklenebilir.");
  if (file.size < 1 || file.size > maxMb * 1024 * 1024) throw new Error(`Dosya en fazla ${maxMb} MB olabilir.`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesAudioSignature(bytes, file.type)) throw new Error("Dosya içeriği bildirilen ses türüyle eşleşmiyor.");

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const extension = audioExtension(file.type);
  const key = `site-assets/audio/${sha256.slice(0, 16)}-${randomUUID()}.${extension}`;
  await putObject(key, bytes, file.type);

  return {
    url: getSiteAssetPublicUrl(key),
    key,
    sha256,
    bytes: bytes.byteLength,
    mimeType: file.type,
  };
}

function readImageDimensions(bytes: Uint8Array, mimeType: string): { width: number; height: number } | null {
  if (mimeType === "image/png" && bytes.length >= 24) return { width: readU32Be(bytes, 16), height: readU32Be(bytes, 20) };
  if (mimeType === "image/webp" && bytes.length >= 30) {
    const chunk = ascii(bytes, 12, 16);
    if (chunk === "VP8X") return { width: 1 + readU24Le(bytes, 24), height: 1 + readU24Le(bytes, 27) };
    if (chunk === "VP8 " && bytes.length >= 30) return { width: readU16Le(bytes, 26) & 0x3fff, height: readU16Le(bytes, 28) & 0x3fff };
    if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) return { width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8), height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10) };
  }
  if (mimeType === "image/jpeg") {
    for (let offset = 2; offset + 8 < bytes.length;) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (length < 2 || offset + length + 2 > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { height: readU16Be(bytes, offset + 5), width: readU16Be(bytes, offset + 7) };
      offset += length + 2;
    }
  }
  return null;
}

function isAnimatedImage(bytes: Uint8Array, mimeType: string) {
  const value = new TextDecoder("latin1").decode(bytes);
  return mimeType === "image/png" ? value.includes("acTL") : mimeType === "image/webp" ? value.includes("ANIM") || value.includes("ANMF") : false;
}

function ascii(bytes: Uint8Array, start: number, end: number) { return String.fromCharCode(...bytes.slice(start, end)); }
function readU16Be(bytes: Uint8Array, offset: number) { return (bytes[offset] << 8) | bytes[offset + 1]; }
function readU16Le(bytes: Uint8Array, offset: number) { return bytes[offset] | (bytes[offset + 1] << 8); }
function readU24Le(bytes: Uint8Array, offset: number) { return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16); }
function readU32Be(bytes: Uint8Array, offset: number) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false); }

export async function deleteSiteAsset(key: string) {
  if (!key.startsWith("site-assets/")) throw new Error("Geçersiz dosya anahtarı.");
  const { bucket, client } = getStorage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(15_000) });
}

export async function getSiteAssetObject(key: string): Promise<StoredSiteAsset | null> {
  const { bucket, client } = getStorage();
  try {
    const object = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { abortSignal: AbortSignal.timeout(15_000) },
    );
    if (!object.Body) return null;
    return {
      body: object.Body.transformToWebStream() as ReadableStream<Uint8Array>,
      contentType: object.ContentType ?? "application/octet-stream",
      cacheControl: object.CacheControl ?? "public, max-age=31536000, immutable",
    };
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

async function putObject(key: string, body: Uint8Array, contentType: string) {
  const { bucket, client } = getStorage();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }), { abortSignal: AbortSignal.timeout(15_000) });
}

let cachedStorage: { signature: string; bucket: string; client: S3Client } | null = null;

function getStorage() {
  const accountId = required("R2_ACCOUNT_ID");
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const accessKeyId = required("R2_ACCESS_KEY_ID");
  const secretAccessKey = required("R2_SECRET_ACCESS_KEY");
  const bucket = required("R2_BUCKET_NAME");

  const signature = `${endpoint}\n${region}\n${accessKeyId}\n${bucket}`;
  if (cachedStorage?.signature === signature) return cachedStorage;
  cachedStorage?.client.destroy();
  cachedStorage = {
    signature,
    bucket,
    client: new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey } }),
  };
  return cachedStorage;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} eksik.`);
  return value;
}

function isMissingObject(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return value.name === "NoSuchKey" || value.$metadata?.httpStatusCode === 404;
}

function isSupportedAudioMimeType(value: string): value is (typeof SUPPORTED_AUDIO_MIME_TYPES)[number] {
  return SUPPORTED_AUDIO_MIME_TYPES.includes(value as (typeof SUPPORTED_AUDIO_MIME_TYPES)[number]);
}

function audioExtension(mimeType: (typeof SUPPORTED_AUDIO_MIME_TYPES)[number]) {
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") return "wav";
  if (mimeType === "audio/ogg") return "ogg";
  if (mimeType === "audio/webm") return "webm";
  return "mp3";
}

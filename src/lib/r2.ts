import "server-only";
import { createHash, randomUUID } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isR2Configured } from "@/lib/system-status";
import { matchesImageSignature } from "@/lib/settings/media-validation";

const acceptedInputMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const limits = {
  avatar: { width: 1024, height: 1024, pixels: 4_000_000 },
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

export async function uploadSiteAsset(file: File, kind: "logo" | "favicon" | "cover" | "avatar", allowedMimeTypes: string[], maxMb: number) {
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
  const { env } = await getCloudflareContext({ async: true });
  if (!env.IMAGES || !env.SITE_ASSETS) throw new Error("Cloudflare görsel veya R2 binding yapılandırılmamış.");
  let outputBytes: Uint8Array;
  try {
    const info = await env.IMAGES.info(new Blob([bytes]).stream());
    if (!("width" in info) || info.width !== dimensions.width || info.height !== dimensions.height) throw new Error("Görsel boyut bilgisi tutarsız.");
    const transformed = await env.IMAGES.input(new Blob([bytes]).stream()).output({ format: "image/webp", quality: kind === "favicon" ? 90 : 82, anim: false });
    outputBytes = new Uint8Array(await new Response(transformed.image()).arrayBuffer());
  } catch (error) {
    if (error instanceof Error && error.message.includes("boyut")) throw error;
    throw new Error("Görsel güvenli biçimde yeniden kodlanamadı.");
  }

  const { publicBaseUrl } = getR2Config();
  const sha256 = createHash("sha256").update(outputBytes).digest("hex");
  const key = `site-assets/${kind}/${sha256.slice(0, 16)}-${randomUUID()}.webp`;
  await env.SITE_ASSETS.put(key, outputBytes, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
  return {
    url: `${publicBaseUrl}/${key}`,
    key,
    sha256,
    bytes: outputBytes.byteLength,
    width: dimensions.width,
    height: dimensions.height,
    mimeType: "image/webp" as const,
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
  const { env } = await getCloudflareContext({ async: true });
  if (!env.SITE_ASSETS) throw new Error("Cloudflare R2 binding yapılandırılmamış.");
  await env.SITE_ASSETS.delete(key);
}

function getR2Config() {
  if (!isR2Configured()) throw new Error("Cloudflare R2 yapılandırılmamış.");
  return {
    publicBaseUrl: requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, ""),
  };
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} eksik.`);
  return value;
}

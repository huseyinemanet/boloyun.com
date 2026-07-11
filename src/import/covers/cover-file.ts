import { createHash } from "node:crypto";

export const MAX_COVER_BYTES = 5 * 1024 * 1024;

const formats = [
  { mime: "image/jpeg", extension: "jpg", matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", extension: "png", matches: (b: Uint8Array) => b.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v) },
  { mime: "image/webp", extension: "webp", matches: (b: Uint8Array) => text(b, 0, 4) === "RIFF" && text(b, 8, 12) === "WEBP" },
] as const;

export function inspectCover(bytes: Uint8Array, declaredContentType: string | null) {
  if (bytes.length === 0) throw new Error("Kapak dosyası boş.");
  if (bytes.length > MAX_COVER_BYTES) throw new Error("Kapak dosyası 5 MB sınırını aşıyor.");
  const format = formats.find((candidate) => candidate.matches(bytes));
  if (!format) throw new Error("Kapak JPEG, PNG veya WebP biçiminde değil.");
  const declared = declaredContentType?.split(";", 1)[0].trim().toLowerCase();
  if (!declared) throw new Error("Kapak yanıtında Content-Type başlığı yok.");
  if (declared !== format.mime) {
    throw new Error(`Kapak MIME türü dosya imzasıyla eşleşmiyor: ${declared}.`);
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  return {
    contentType: format.mime,
    extension: format.extension,
    hash,
    key: `covers/sha256/${hash.slice(0, 2)}/${hash}.${format.extension}`,
    byteSize: bytes.length,
  };
}

function text(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

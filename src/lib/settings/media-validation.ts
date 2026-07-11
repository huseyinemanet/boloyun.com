export const SUPPORTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"] as const;

export function matchesImageSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/webp") return ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
  if (mime === "image/x-icon" || mime === "image/vnd.microsoft.icon") return startsWith(bytes, [0x00, 0x00, 0x01, 0x00]);
  return false;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, offset: number, value: string) {
  return [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

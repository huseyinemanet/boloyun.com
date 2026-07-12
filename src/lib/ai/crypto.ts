import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "v1";

export function encryptApiKey(apiKey: string) {
  const clean = apiKey.trim();
  if (!clean) throw new Error("API key boş olamaz.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptApiKey(value: string) {
  const [prefix, ivRaw, tagRaw, encryptedRaw] = value.split(":");
  if (prefix !== PREFIX || !ivRaw || !tagRaw || !encryptedRaw) throw new Error("API key kaydı geçersiz.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function apiKeyFingerprint(apiKey: string) {
  return createHash("sha256").update(apiKey.trim()).digest("hex").slice(0, 16);
}

export function maskFingerprint(fingerprint: string | null) {
  return fingerprint ? `sha256:${fingerprint.slice(0, 6)}...${fingerprint.slice(-4)}` : "Key yok";
}

export function fingerprintsEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function encryptionKey() {
  const secret = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  if (!secret || secret.trim().length < 16) {
    throw new Error("AI_SETTINGS_ENCRYPTION_KEY en az 16 karakter olacak şekilde yapılandırılmalı.");
  }
  return createHash("sha256").update(secret).digest();
}

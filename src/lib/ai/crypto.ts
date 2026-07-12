const PREFIX = "v1";

export async function encryptApiKey(apiKey: string) {
  const clean = apiKey.trim();
  if (!clean) throw new Error("API key boş olamaz.");
  const iv = new Uint8Array(12);
  cryptoProvider().getRandomValues(iv);
  const encrypted = await cryptoProvider().subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(clean),
  );
  return [PREFIX, encodeBase64Url(iv), encodeBase64Url(new Uint8Array(encrypted))].join(":");
}

export async function decryptApiKey(value: string) {
  const [prefix, ivRaw, encryptedRaw] = value.split(":");
  if (prefix !== PREFIX || !ivRaw || !encryptedRaw) throw new Error("API key kaydı geçersiz.");
  const decrypted = await cryptoProvider().subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64Url(ivRaw) },
    await encryptionKey(),
    decodeBase64Url(encryptedRaw),
  );
  return new TextDecoder().decode(decrypted);
}

export async function apiKeyFingerprint(apiKey: string) {
  return sha256Hex(apiKey.trim()).then((hash) => hash.slice(0, 16));
}

export function maskFingerprint(fingerprint: string | null) {
  return fingerprint ? `sha256:${fingerprint.slice(0, 6)}...${fingerprint.slice(-4)}` : "Key yok";
}

export function fingerprintsEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function encryptionKey() {
  const secret = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  if (!secret || secret.trim().length < 16) {
    throw new Error("AI_SETTINGS_ENCRYPTION_KEY en az 16 karakter olacak şekilde yapılandırılmalı.");
  }
  return cryptoProvider().subtle.importKey(
    "raw",
    await sha256Bytes(secret),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function cryptoProvider() {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto desteği bulunamadı.");
  return globalThis.crypto;
}

async function sha256Bytes(value: string) {
  return cryptoProvider().subtle.digest("SHA-256", new TextEncoder().encode(value));
}

async function sha256Hex(value: string) {
  return Array.from(new Uint8Array(await sha256Bytes(value)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function encodeBase64Url(bytes: Uint8Array) {
  const base64 = typeof Buffer !== "undefined"
    ? Buffer.from(bytes).toString("base64")
    : btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof Buffer !== "undefined") return Buffer.from(base64, "base64");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

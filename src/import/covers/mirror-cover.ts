import { inspectCover, MAX_COVER_BYTES } from "./cover-file";
import { uploadCoverObject } from "./r2-cover-store";
import { safeExternalRequest, type SafeExternalResponse } from "@/import/security/safe-fetch";

const REQUEST_TIMEOUT_MS = 15_000;

export type MirroredCover = {
  sourceUrl: string;
  publicUrl: string;
  r2Key: string;
  contentType: string;
  byteSize: number;
  hash: string;
};

export async function mirrorGameCover(sourceUrl: string): Promise<MirroredCover> {
  const source = validateSourceUrl(sourceUrl);
  const response = await fetchWithRetry(source, "GET", MAX_COVER_BYTES);
  if (!response.ok) throw new Error(`Kapak indirilemedi: HTTP ${response.status}.`);
  const bytes = response.bytes;
  const inspected = inspectCover(bytes, response.headers.get("content-type"));
  const publicUrl = await uploadCoverObject({ key: inspected.key, bytes, contentType: inspected.contentType });
  const verification = await fetchWithRetry(publicUrl, "HEAD", 0);
  if (!verification.ok) throw new Error(`CDN doğrulaması başarısız: HTTP ${verification.status}.`);
  const verifiedType = verification.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (verifiedType && verifiedType !== inspected.contentType) throw new Error("CDN içerik türü yüklenen dosyayla eşleşmiyor.");
  return {
    sourceUrl: source,
    publicUrl,
    r2Key: inspected.key,
    contentType: inspected.contentType,
    byteSize: inspected.byteSize,
    hash: inspected.hash,
  };
}

export function isCdnCoverUrl(value: string) {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return Boolean(base && value.startsWith(`${base}/covers/`));
}

async function fetchWithRetry(url: string, method: "GET" | "HEAD", maxResponseBytes: number, attempts = 3): Promise<SafeExternalResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await safeExternalRequest(url, { method, timeoutMs: REQUEST_TIMEOUT_MS, maxResponseBytes });
      if ((response.status === 429 || response.status >= 500) && attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw new Error(`Kapak isteği başarısız: ${lastError instanceof Error ? lastError.message : "bilinmeyen ağ hatası"}`);
}

function validateSourceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Kapak URL'si geçersiz.");
  }
  if (url.protocol !== "https:") throw new Error("Kapak URL'si HTTPS olmalı.");
  return url.toString();
}

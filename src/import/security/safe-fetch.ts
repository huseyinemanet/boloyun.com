import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const MAX_REDIRECTS = 5;

export async function safeExternalFetch(input: string, init: RequestInit = {}) {
  let url = await assertPublicHttpUrl(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(url, { ...init, redirect: "manual", signal: init.signal ?? AbortSignal.timeout(20_000) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || redirects === MAX_REDIRECTS) throw new Error("Çok fazla veya geçersiz yönlendirme.");
    url = await assertPublicHttpUrl(new URL(location, url).toString());
  }
  throw new Error("Dış kaynak indirilemedi.");
}

export async function assertPublicHttpUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Yalnızca HTTP(S) dış kaynakları desteklenir.");
  if (url.username || url.password || url.port && !["80", "443"].includes(url.port)) throw new Error("Dış kaynak adresi güvenli değil.");
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Özel ağ adreslerine erişim engellendi.");
  return url;
}

export async function readExternalText(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("Dış kaynak yanıtı boyut sınırını aşıyor.");
  if (!response.body) throw new Error("Dış kaynak yanıt gövdesi yok.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Dış kaynak yanıtı boyut sınırını aşıyor.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const ipv4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  const parts = ipv4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

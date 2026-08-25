import type { LookupAddress } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, request, type Dispatcher } from "undici";

const MAX_REDIRECTS = 5;
const ALLOWED_PORTS = new Set(["80", "443"]);
const FORBIDDEN_HEADERS = new Set([
  "accept-encoding", "authorization", "connection", "cookie", "host", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
]);

export type SafeExternalRequestOptions = {
  method?: "GET" | "HEAD";
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs: number;
  maxResponseBytes: number;
};

export type SafeExternalResponse = {
  status: number;
  ok: boolean;
  finalUrl: URL;
  headers: Headers;
  bytes: Uint8Array;
};

type ResponseBody = AsyncIterable<Uint8Array> & { destroy(error?: Error): void };
type RequestResult = { statusCode: number; headers: Record<string, string | string[] | undefined>; body: ResponseBody };
type RequestOptions = {
  method: "GET" | "HEAD";
  headers: Record<string, string>;
  signal: AbortSignal;
  dispatcher: Dispatcher;
  maxRedirections: 0;
};

export type OutboundHttpDependencies = {
  resolve?: (hostname: string) => Promise<LookupAddress[]>;
  createDispatcher?: (hostname: string, addresses: LookupAddress[]) => Dispatcher;
  performRequest?: (url: URL, options: RequestOptions) => Promise<RequestResult>;
};

export async function safeExternalRequest(
  input: string | URL,
  options: SafeExternalRequestOptions,
  dependencies: OutboundHttpDependencies = {},
): Promise<SafeExternalResponse> {
  const method = options.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") throw new Error("Yalnız GET ve HEAD dış isteklerine izin verilir.");
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0) throw new Error("Dış istek zaman aşımı geçersiz.");
  if (!Number.isSafeInteger(options.maxResponseBytes) || options.maxResponseBytes < 0) throw new Error("Dış istek boyut sınırı geçersiz.");
  if (method === "GET" && options.maxResponseBytes === 0) throw new Error("GET dış isteği için pozitif boyut sınırı gerekli.");
  if (method === "HEAD" && options.maxResponseBytes !== 0) throw new Error("HEAD dış isteği için boyut sınırı sıfır olmalı.");

  const headers = normalizeHeaders(options.headers);
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const resolve = dependencies.resolve ?? resolveHostname;
  const createDispatcher = dependencies.createDispatcher ?? createPinnedDispatcher;
  const performRequest = dependencies.performRequest ?? defaultPerformRequest;
  let current = validateExternalUrl(input);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const addresses = validateResolvedAddresses(await withAbort(resolve(current.hostname), signal));
    const dispatcher = createDispatcher(current.hostname, addresses);
    try {
      const result = await performRequest(current, { method, headers, signal, dispatcher, maxRedirections: 0 });
      const responseHeaders = toHeaders(result.headers);
      const contentEncoding = responseHeaders.get("content-encoding")?.trim().toLowerCase();
      if (contentEncoding && contentEncoding !== "identity") {
        result.body.destroy();
        throw new Error("Sıkıştırılmış dış yanıtlara izin verilmiyor.");
      }
      if (isRedirect(result.statusCode)) {
        result.body.destroy();
        if (redirectCount === MAX_REDIRECTS) throw new Error("Dış istek çok fazla yönlendirme içeriyor.");
        const location = responseHeaders.get("location");
        if (!location) throw new Error("Dış istek yönlendirmesinde Location başlığı yok.");
        current = validateExternalUrl(new URL(location, current));
        continue;
      }

      const bytes = method === "HEAD"
        ? (result.body.destroy(), new Uint8Array())
        : await readBoundedBody(result.body, responseHeaders, options.maxResponseBytes);
      return {
        status: result.statusCode,
        ok: result.statusCode >= 200 && result.statusCode < 300,
        finalUrl: current,
        headers: responseHeaders,
        bytes,
      };
    } finally {
      await dispatcher.close();
    }
  }
  throw new Error("Dış istek tamamlanamadı.");
}

export function validateExternalUrl(input: string | URL) {
  const url = input instanceof URL ? new URL(input) : new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Yalnız HTTP(S) adreslerine izin verilir.");
  if (url.username || url.password) throw new Error("Kimlik bilgisi içeren dış URL'lere izin verilmez.");
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (!ALLOWED_PORTS.has(port)) throw new Error("Dış URL portuna izin verilmiyor.");
  url.hash = "";
  return url;
}

export function validateResolvedAddresses(addresses: LookupAddress[]) {
  if (addresses.length === 0) throw new Error("Dış adres çözümlenemedi.");
  const normalized = addresses.map(({ address }) => {
    const parsed = ipaddr.process(address);
    if (parsed.range() !== "unicast") throw new Error("Özel veya ayrılmış ağ adreslerine erişim engellendi.");
    return { address: parsed.toString(), family: parsed.kind() === "ipv4" ? 4 : 6 } satisfies LookupAddress;
  });
  return [...new Map(normalized.map((entry) => [`${entry.family}:${entry.address}`, entry])).values()];
}

function normalizeHeaders(input?: HeadersInit) {
  const headers = new Headers(input);
  for (const name of headers.keys()) {
    if (FORBIDDEN_HEADERS.has(name.toLowerCase())) throw new Error(`Dış istek başlığına izin verilmiyor: ${name}.`);
  }
  headers.set("accept-encoding", "identity");
  return Object.fromEntries(headers.entries());
}

async function resolveHostname(hostname: string) {
  return dnsLookup(hostname, { all: true, verbatim: true });
}

export function createPinnedDispatcher(expectedHostname: string, addresses: LookupAddress[]) {
  const lookup: LookupFunction = (hostname, options, callback) => {
    if (hostname !== expectedHostname) {
      callback(Object.assign(new Error("Beklenmeyen DNS adı istendi."), { code: "EAI_FAIL" }), "", 0);
      return;
    }
    const family = typeof options === "number" ? options : options.family;
    const candidates = family === 4 || family === 6 ? addresses.filter((entry) => entry.family === family) : addresses;
    if (candidates.length === 0) {
      callback(Object.assign(new Error("Doğrulanmış IP ailesi bulunamadı."), { code: "EAI_FAIL" }), "", 0);
      return;
    }
    if (typeof options === "object" && options.all) {
      callback(null, candidates);
      return;
    }
    callback(null, candidates[0].address, candidates[0].family);
  };
  return new Agent({ connect: { lookup }, autoSelectFamily: true, autoSelectFamilyAttemptTimeout: 250 });
}

async function defaultPerformRequest(url: URL, options: RequestOptions): Promise<RequestResult> {
  return await request(url, options) as unknown as RequestResult;
}

async function readBoundedBody(body: ResponseBody, headers: Headers, maxBytes: number) {
  const declaredLength = Number(headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    body.destroy();
    throw new Error(`Dış yanıt ${maxBytes} bayt sınırını aşıyor.`);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of body) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      body.destroy();
      throw new Error(`Dış yanıt ${maxBytes} bayt sınırını aşıyor.`);
    }
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function toHeaders(input: Record<string, string | string[] | undefined>) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(input)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

function isRedirect(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function withAbort<T>(promise: Promise<T>, signal: AbortSignal) {
  signal.throwIfAborted();
  return await new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

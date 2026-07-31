import { headers } from "next/headers";

export async function getRequestOrigin() {
  return getRequestOriginFromHeaders(await headers());
}

export function getRequestOriginFromHeaders(headerStore: Pick<Headers, "get">) {
  const configuredOrigin = configuredSiteOrigin();
  const host = firstHeaderValue(headerStore.get("host"));
  const localOrigin = process.env.NODE_ENV === "production" ? null : localOriginFromHost(host);
  if (localOrigin) return localOrigin;
  return configuredOrigin;
}

export function publicUrlFromRequest(request: Request, path: string) {
  if (process.env.NODE_ENV !== "production") {
    try {
      const requestUrl = new URL(request.url);
      if (isLoopbackHostname(requestUrl.hostname)) return new URL(path, requestUrl.origin);
    } catch {
      // Fall back to the configured public origin.
    }
  }
  return new URL(path, configuredSiteOrigin());
}

export function hasTrustedMutationOriginFromHeaders(headerStore: Pick<Headers, "get">) {
  const origin = headerStore.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === getRequestOriginFromHeaders(headerStore);
  } catch {
    return false;
  }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function localOriginFromHost(host: string | null) {
  if (!host) return null;
  try {
    const url = new URL(`http://${host}`);
    return isLoopbackHostname(url.hostname) ? url.origin : null;
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function configuredSiteOrigin() {
  const candidate = process.env.SITE_URL || "https://boloyun.com";
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "https://boloyun.com";
    return url.origin;
  } catch {
    return "https://boloyun.com";
  }
}

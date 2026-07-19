import { headers } from "next/headers";

export async function getRequestOrigin() {
  return getRequestOriginFromHeaders(await headers());
}

export function getRequestOriginFromHeaders(headerStore: Pick<Headers, "get">) {
  const configuredOrigin = configuredSiteOrigin();
  if (process.env.NODE_ENV === "production" || process.env.SITE_URL) return configuredOrigin;

  const host = firstHeaderValue(headerStore.get("host"));
  if (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")) return `http://${host}`;
  return configuredOrigin;
}

export function publicUrlFromRequest(_request: Request, path: string) {
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

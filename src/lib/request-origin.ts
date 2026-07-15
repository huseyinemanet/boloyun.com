import { headers } from "next/headers";

export async function getRequestOrigin() {
  return getRequestOriginFromHeaders(await headers());
}

export function getRequestOriginFromHeaders(headerStore: Pick<Headers, "get">) {
  const origin = headerStore.get("origin");
  const forwardedHost = firstHeaderValue(headerStore.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(headerStore.get("host"));

  if (host === "0.0.0.0:3000" || host === "0.0.0.0") {
    return process.env.SITE_URL || "https://boloyun.com";
  }
  if (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")) {
    return `http://${host}`;
  }

  if (host === "boloyun.com" || host === "www.boloyun.com") {
    return `https://${host}`;
  }

  if (origin) return origin;

  const proto = headerStore.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return process.env.SITE_URL || "http://localhost:3000";
}

export function publicUrlFromRequest(request: Request, path: string) {
  return new URL(path, getRequestOriginFromHeaders(request.headers));
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

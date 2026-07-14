export const CACHE_CONTROL = {
  immutableAsset: "public, max-age=31536000, immutable",
  publicAsset: "public, max-age=86400, stale-while-revalidate=604800",
  publicHtml: "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
  publicDataShort: "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  publicData: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  sitemap: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  privateNoStore: "private, no-store",
  noStore: "no-store",
} as const;

export type CachePolicyName = keyof typeof CACHE_CONTROL;

export function cacheControl(policy: CachePolicyName) {
  return CACHE_CONTROL[policy];
}

export function cacheHeaders(policy: CachePolicyName) {
  return { "Cache-Control": cacheControl(policy) };
}

export function mergeCacheHeaders(policy: CachePolicyName, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Cache-Control", cacheControl(policy));
  return nextHeaders;
}

export function isPrivateCacheControl(value: string | null | undefined) {
  if (!value) return false;
  const normalized = value.toLocaleLowerCase("en-US");
  return normalized.includes("private") || normalized.includes("no-store");
}

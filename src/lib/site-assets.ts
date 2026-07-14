const SITE_ASSET_PREFIX = "site-assets/";
const allowedSiteAssetKinds = new Set(["avatar", "logo", "favicon", "cover"]);
const safeSegmentPattern = /^[a-zA-Z0-9._-]+$/;

export function getSiteAssetPublicUrl(key: string) {
  if (!key.startsWith(SITE_ASSET_PREFIX)) throw new Error("Geçersiz dosya anahtarı.");
  return `/${key}`;
}

export function normalizeSiteAssetUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith(`/${SITE_ASSET_PREFIX}`)) return url;
  if (url.startsWith(SITE_ASSET_PREFIX)) return `/${url}`;

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith(`/${SITE_ASSET_PREFIX}`)) return parsed.pathname;
  } catch {
    return url;
  }

  return url;
}

export function getSiteAssetStorageKey(segments: string[]) {
  if (!segments.length) return null;
  if (!allowedSiteAssetKinds.has(segments[0])) return null;
  if (!segments.every((segment) => segment && safeSegmentPattern.test(segment))) return null;
  return `${SITE_ASSET_PREFIX}${segments.join("/")}`;
}

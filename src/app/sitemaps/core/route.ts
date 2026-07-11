import { getCoreSitemapRecords } from "@/lib/db-seo";
import { getPublicSettings } from "@/lib/db-settings";
import { sitemapUrlSet, xmlResponse } from "@/lib/seo/sitemap-xml";

export const revalidate = 3600;

export async function GET() {
  const [{ seo }, records] = await Promise.all([getPublicSettings(), getCoreSitemapRecords()]);
  if (!seo.sitemapEnabled) return xmlResponse(sitemapUrlSet([], seo.canonicalDomain));
  const visibleRecords = records.filter((record) =>
    (record.kind !== "tag" || seo.sitemapIncludeTags)
    && (record.kind !== "static" || seo.sitemapIncludeStaticPages));
  return xmlResponse(sitemapUrlSet(visibleRecords, seo.canonicalDomain, true));
}

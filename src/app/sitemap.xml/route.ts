import { getGameSitemapCount } from "@/lib/db-seo";
import { getPublicSettings } from "@/lib/db-settings";
import { absoluteUrl } from "@/lib/seo/metadata";
import { sitemapIndex, xmlResponse } from "@/lib/seo/sitemap-xml";

const GAME_SITEMAP_SIZE = 1000;

export const revalidate = 3600;

export async function GET() {
  const [{ seo }, gameCount] = await Promise.all([getPublicSettings(), getGameSitemapCount()]);
  if (!seo.sitemapEnabled) return xmlResponse(sitemapIndex([]));
  const urls = [absoluteUrl("/sitemaps/core", seo.canonicalDomain)];
  for (let page = 0; page < Math.ceil(gameCount / GAME_SITEMAP_SIZE); page += 1) {
    urls.push(absoluteUrl(`/sitemaps/games/${page}`, seo.canonicalDomain));
  }
  return xmlResponse(sitemapIndex(urls));
}

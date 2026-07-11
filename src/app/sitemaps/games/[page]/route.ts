import { getGameSitemapPage } from "@/lib/db-seo";
import { getPublicSettings } from "@/lib/db-settings";
import { sitemapUrlSet, xmlResponse } from "@/lib/seo/sitemap-xml";

const GAME_SITEMAP_SIZE = 1000;

export const revalidate = 3600;

export async function GET(_request: Request, { params }: { params: Promise<{ page: string }> }) {
  const page = Number((await params).page);
  if (!Number.isInteger(page) || page < 0) return xmlResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" />", 404);
  const [{ seo }, records] = await Promise.all([getPublicSettings(), getGameSitemapPage(page, GAME_SITEMAP_SIZE)]);
  if (!seo.sitemapEnabled || records.length === 0) return xmlResponse(sitemapUrlSet([], seo.canonicalDomain), 404);
  return xmlResponse(sitemapUrlSet(records, seo.canonicalDomain));
}

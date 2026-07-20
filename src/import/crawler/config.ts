import type { EnqueueCrawlerJobInput } from "./types";

export const MAX_CRAWLER_DISCOVER_LIMIT = 5_000;
export const MAX_CRAWLER_SCRAPE_LIMIT = 500;

export function parseCrawlerJobInput(body: Record<string, unknown>, requestedBy: string): EnqueueCrawlerJobInput {
  const sitemapUrl = String(body.sitemapUrl || "https://www.miniplay.com/sitemap.xml").trim();
  const parsedSitemapUrl = new URL(sitemapUrl);
  if (parsedSitemapUrl.protocol !== "https:") throw new Error("Sitemap URL HTTPS olmalıdır.");
  const requested = parsePositiveInteger(body.discoverLimit, 100);
  const rawScrapeLimit = body.scrapeLimit;
  const scrapeLimit = rawScrapeLimit === "all" || rawScrapeLimit === "" || rawScrapeLimit === null || typeof rawScrapeLimit === "undefined"
    ? null
    : clamp(parsePositiveInteger(rawScrapeLimit, MAX_CRAWLER_SCRAPE_LIMIT), 0, MAX_CRAWLER_SCRAPE_LIMIT);

  return {
    requestedBy,
    sitemapUrl: parsedSitemapUrl.toString(),
    discoverLimit: clamp(requested, 1, MAX_CRAWLER_DISCOVER_LIMIT),
    scrapeLimit,
    scrapeNow: Boolean(body.scrapeNow),
  };
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

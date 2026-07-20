export type CrawlerJobStatus = "queued" | "running" | "completed" | "failed";

export type CrawlerJobPhase = "discover" | "process" | "complete";

export type CrawlerStats = {
  requested: number;
  limit: number;
  discovered: number;
  duplicateChecked: number;
  inserted: number;
  skipped: number;
  pendingDiscovered: number;
  scrapeLimit: number;
  scraped: number;
  aiGenerated: number;
  pendingReview: number;
  failed: number;
};

export type CrawlerTarget = {
  id: string;
  sourceUrl: string;
  sourceDomain: string | null;
};

export type CrawlerJob = {
  id: string;
  requestedBy: string | null;
  sitemapUrl: string;
  discoverLimit: number;
  requestedScrapeLimit: number | null;
  scrapeNow: boolean;
  status: CrawlerJobStatus;
  phase: CrawlerJobPhase;
  stats: CrawlerStats;
  targets: CrawlerTarget[];
  targetCursor: number;
  message: string;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EnqueueCrawlerJobInput = {
  requestedBy: string;
  sitemapUrl: string;
  discoverLimit: number;
  scrapeLimit: number | null;
  scrapeNow: boolean;
};

export const emptyCrawlerStats: CrawlerStats = {
  requested: 0,
  limit: 0,
  discovered: 0,
  duplicateChecked: 0,
  inserted: 0,
  skipped: 0,
  pendingDiscovered: 0,
  scrapeLimit: 0,
  scraped: 0,
  aiGenerated: 0,
  pendingReview: 0,
  failed: 0,
};

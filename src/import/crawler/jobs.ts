import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/client";
import type {
  CrawlerJob,
  CrawlerJobPhase,
  CrawlerJobStatus,
  CrawlerStats,
  CrawlerTarget,
  EnqueueCrawlerJobInput,
} from "./types";

type CrawlerJobRow = {
  id: string;
  requested_by: string | null;
  sitemap_url: string;
  discover_limit: number;
  scrape_limit: number | null;
  scrape_now: boolean;
  status: CrawlerJobStatus;
  phase: CrawlerJobPhase;
  discovered_count: number;
  duplicate_checked_count: number;
  inserted_count: number;
  skipped_count: number;
  pending_discovered_count: number;
  target_count: number;
  scraped_count: number;
  ai_generated_count: number;
  pending_review_count: number;
  failed_count: number;
  targets: unknown;
  target_cursor: number;
  message: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrawlerJobUpdate = Partial<{
  status: CrawlerJobStatus;
  phase: CrawlerJobPhase;
  discovered_count: number;
  duplicate_checked_count: number;
  inserted_count: number;
  skipped_count: number;
  pending_discovered_count: number;
  target_count: number;
  scraped_count: number;
  ai_generated_count: number;
  pending_review_count: number;
  failed_count: number;
  targets: CrawlerTarget[];
  target_cursor: number;
  message: string;
  error_message: string | null;
  locked_at: string | null;
  worker_id: string | null;
  completed_at: string | null;
  updated_at: string;
}>;

const CRAWLER_JOB_COLUMNS = [
  "id",
  "requested_by",
  "sitemap_url",
  "discover_limit",
  "scrape_limit",
  "scrape_now",
  "status",
  "phase",
  "discovered_count",
  "duplicate_checked_count",
  "inserted_count",
  "skipped_count",
  "pending_discovered_count",
  "target_count",
  "scraped_count",
  "ai_generated_count",
  "pending_review_count",
  "failed_count",
  "targets",
  "target_cursor",
  "message",
  "error_message",
  "started_at",
  "completed_at",
  "created_at",
  "updated_at",
].join(", ");

export async function enqueueCrawlerJob(input: EnqueueCrawlerJobInput) {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("crawler_jobs")
    .insert({
      requested_by: input.requestedBy,
      sitemap_url: input.sitemapUrl,
      discover_limit: input.discoverLimit,
      scrape_limit: input.scrapeLimit,
      scrape_now: input.scrapeNow,
      message: "İş kuyruğa alındı.",
    })
    .select(CRAWLER_JOB_COLUMNS)
    .single();

  if (error || !data) throw new Error(`Crawler işi kuyruğa alınamadı: ${error?.message ?? "kayıt yok"}`);
  return mapCrawlerJob(data as unknown as CrawlerJobRow);
}

export async function getCrawlerJob(id: string) {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("crawler_jobs")
    .select(CRAWLER_JOB_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Crawler işi okunamadı: ${error.message}`);
  return data ? mapCrawlerJob(data as unknown as CrawlerJobRow) : null;
}

export async function getLatestCrawlerJob() {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("crawler_jobs")
    .select(CRAWLER_JOB_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Son crawler işi okunamadı: ${error.message}`);
  return data ? mapCrawlerJob(data as unknown as CrawlerJobRow) : null;
}

export async function getActiveCrawlerJob() {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("crawler_jobs")
    .select(CRAWLER_JOB_COLUMNS)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Aktif crawler işi okunamadı: ${error.message}`);
  return data ? mapCrawlerJob(data as unknown as CrawlerJobRow) : null;
}

export async function claimCrawlerJob(workerId: string) {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase.rpc("claim_crawler_job", { p_worker_id: workerId });
  if (error) throw new Error(`Crawler işi alınamadı: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapCrawlerJob(row as CrawlerJobRow) : null;
}

export async function updateCrawlerJob(id: string, update: CrawlerJobUpdate) {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("crawler_jobs")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(CRAWLER_JOB_COLUMNS)
    .single();
  if (error || !data) throw new Error(`Crawler işi güncellenemedi: ${error?.message ?? "kayıt yok"}`);
  return mapCrawlerJob(data as unknown as CrawlerJobRow);
}

function requiredServiceClient() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Crawler kuyruğu için Supabase service client gerekli.");
  return supabase;
}

function mapCrawlerJob(row: CrawlerJobRow): CrawlerJob {
  const targets = Array.isArray(row.targets)
    ? row.targets.filter(isCrawlerTarget)
    : [];
  const stats: CrawlerStats = {
    requested: row.discover_limit,
    limit: row.discover_limit,
    discovered: row.discovered_count,
    duplicateChecked: row.duplicate_checked_count,
    inserted: row.inserted_count,
    skipped: row.skipped_count,
    pendingDiscovered: row.pending_discovered_count,
    scrapeLimit: row.target_count,
    scraped: row.scraped_count,
    aiGenerated: row.ai_generated_count,
    pendingReview: row.pending_review_count,
    failed: row.failed_count,
  };
  return {
    id: row.id,
    requestedBy: row.requested_by,
    sitemapUrl: row.sitemap_url,
    discoverLimit: row.discover_limit,
    requestedScrapeLimit: row.scrape_limit,
    scrapeNow: row.scrape_now,
    status: row.status,
    phase: row.phase,
    stats,
    targets,
    targetCursor: row.target_cursor,
    message: row.message ?? "İşleniyor.",
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isCrawlerTarget(value: unknown): value is CrawlerTarget {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const target = value as Record<string, unknown>;
  return typeof target.id === "string" && typeof target.sourceUrl === "string";
}

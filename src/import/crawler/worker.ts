import "server-only";

import { generateGameContent } from "@/import/ai/generate-game-content";
import {
  getDiscoveredImportsBySourceUrls,
  insertNewDiscoveredImports,
  markImportFailed,
  markImportPendingReview,
  markImportScraped,
  type GameImportQueueItem,
} from "@/import/db/game-imports";
import { scrapeGame } from "@/import/scrape/scrape-game";
import { discoverGameUrls } from "@/import/sitemap/discover";
import { MAX_CRAWLER_SCRAPE_LIMIT } from "./config";
import { claimCrawlerJob, updateCrawlerJob } from "./jobs";
import type { CrawlerJob, CrawlerTarget } from "./types";

const DEFAULT_BATCH_SIZE = 2;
const MAX_BATCH_SIZE = 10;

export async function runCrawlerQueueTick(workerId: string, options: { batchSize?: number } = {}) {
  const job = await claimCrawlerJob(workerId);
  if (!job) return { status: "idle" as const };

  try {
    if (job.phase === "discover") {
      const nextJob = await discoverCrawlerJob(job);
      return { status: nextJob.status === "completed" ? "completed" as const : "processed" as const, job: nextJob };
    }

    if (job.phase === "process") {
      const batchSize = clampInteger(options.batchSize, 1, MAX_BATCH_SIZE, DEFAULT_BATCH_SIZE);
      const nextJob = await processCrawlerJobBatch(job, batchSize);
      return { status: nextJob.status === "completed" ? "completed" as const : "processed" as const, job: nextJob };
    }

    const completed = await updateCrawlerJob(job.id, {
      status: "completed",
      phase: "complete",
      message: job.message || "Crawler işi tamamlandı.",
      completed_at: job.completedAt ?? new Date().toISOString(),
      locked_at: null,
      worker_id: null,
    });
    return { status: "completed" as const, job: completed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateCrawlerJob(job.id, {
      status: "failed",
      message: "Crawler işi tamamlanamadı.",
      error_message: message,
      completed_at: new Date().toISOString(),
      locked_at: null,
      worker_id: null,
    }).catch((updateError) => {
      console.error("[crawler-worker] failed job could not be persisted", {
        jobId: job.id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      });
    });
    throw error;
  }
}

async function discoverCrawlerJob(job: CrawlerJob) {
  let lastProgressWrite = 0;
  const discovered = await discoverGameUrls(job.sitemapUrl, job.discoverLimit, async (progress) => {
    const now = Date.now();
    if (now - lastProgressWrite < 1_000 && progress.discovered < job.discoverLimit) return;
    lastProgressWrite = now;
    await updateCrawlerJob(job.id, {
      discovered_count: progress.discovered,
      message: `${progress.discovered.toLocaleString("tr-TR")} oyun URL'i bulundu.`,
      locked_at: new Date().toISOString(),
    });
  });

  let duplicateChecked = 0;
  const insertResult = await insertNewDiscoveredImports(discovered, async (progress) => {
    if (progress.phase === "duplicates") duplicateChecked = progress.checked ?? duplicateChecked;
    await updateCrawlerJob(job.id, {
      duplicate_checked_count: duplicateChecked,
      inserted_count: progress.inserted ?? 0,
      skipped_count: progress.skipped ?? 0,
      message: progress.phase === "duplicates" ? "Mevcut kayıtlar kontrol ediliyor." : "Yeni URL'ler kaydediliyor.",
      locked_at: new Date().toISOString(),
    });
  });

  if (!job.scrapeNow) {
    return updateCrawlerJob(job.id, {
      status: "completed",
      phase: "complete",
      discovered_count: discovered.length,
      duplicate_checked_count: duplicateChecked,
      inserted_count: insertResult.insertedCount,
      skipped_count: insertResult.skippedCount,
      message: `Keşif tamamlandı. ${insertResult.insertedCount.toLocaleString("tr-TR")} yeni URL kuyruğa eklendi.`,
      completed_at: new Date().toISOString(),
      locked_at: null,
      worker_id: null,
    });
  }

  const requestedScrapeLimit = Math.min(job.requestedScrapeLimit ?? discovered.length, MAX_CRAWLER_SCRAPE_LIMIT);
  const remainingLimit = Math.max(0, requestedScrapeLimit - insertResult.inserted.length);
  let pendingDiscovered = 0;
  const insertedSourceUrls = new Set(insertResult.inserted.map((item) => item.source_url));
  const existingTargets = await getDiscoveredImportsBySourceUrls(
    discovered.map((item) => item.sourceUrl).filter((sourceUrl) => !insertedSourceUrls.has(sourceUrl)),
    remainingLimit,
    async (progress) => {
      pendingDiscovered = progress.found;
      await updateCrawlerJob(job.id, {
        pending_discovered_count: progress.found,
        message: "Daha önce keşfedilen kayıtlar işleme hazırlanıyor.",
        locked_at: new Date().toISOString(),
      });
    },
  );
  const targets = uniqueTargets([...insertResult.inserted, ...existingTargets])
    .slice(0, requestedScrapeLimit)
    .map(toCrawlerTarget);

  if (targets.length === 0) {
    return updateCrawlerJob(job.id, {
      status: "completed",
      phase: "complete",
      discovered_count: discovered.length,
      duplicate_checked_count: duplicateChecked,
      inserted_count: insertResult.insertedCount,
      skipped_count: insertResult.skippedCount,
      pending_discovered_count: pendingDiscovered,
      target_count: 0,
      targets: [],
      message: "İşlenecek yeni kayıt bulunamadı.",
      completed_at: new Date().toISOString(),
      locked_at: null,
      worker_id: null,
    });
  }

  return updateCrawlerJob(job.id, {
    status: "queued",
    phase: "process",
    discovered_count: discovered.length,
    duplicate_checked_count: duplicateChecked,
    inserted_count: insertResult.insertedCount,
    skipped_count: insertResult.skippedCount,
    pending_discovered_count: pendingDiscovered,
    target_count: targets.length,
    targets,
    target_cursor: 0,
    message: `${targets.length.toLocaleString("tr-TR")} oyun işlenmek üzere hazırlandı.`,
    locked_at: null,
    worker_id: null,
  });
}

async function processCrawlerJobBatch(job: CrawlerJob, batchSize: number) {
  const targets = job.targets.slice(job.targetCursor, job.targetCursor + batchSize);
  let cursor = job.targetCursor;
  let scraped = job.stats.scraped;
  let aiGenerated = job.stats.aiGenerated;
  let pendingReview = job.stats.pendingReview;
  let failed = job.stats.failed;

  for (const target of targets) {
    await updateCrawlerJob(job.id, {
      message: `${cursor + 1} / ${job.targets.length} oyun işleniyor: ${target.sourceUrl}`,
      locked_at: new Date().toISOString(),
    });
    try {
      const parsed = await scrapeGame(target.sourceUrl, "miniplay");
      await markImportScraped(target.id, parsed);
      scraped += 1;
      const generated = await generateGameContent(parsed);
      await markImportPendingReview(target.id, parsed, generated);
      aiGenerated += 1;
      pendingReview += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      await markImportFailed(target.id, message).catch((markError) => {
        console.error("[crawler-worker] failed import could not be marked", {
          importId: target.id,
          error: markError instanceof Error ? markError.message : String(markError),
        });
      });
      failed += 1;
    }
    cursor += 1;
    await updateCrawlerJob(job.id, {
      target_cursor: cursor,
      scraped_count: scraped,
      ai_generated_count: aiGenerated,
      pending_review_count: pendingReview,
      failed_count: failed,
      message: `${cursor} / ${job.targets.length} oyun işlendi.`,
      locked_at: new Date().toISOString(),
    });
  }

  const completed = cursor >= job.targets.length;
  return updateCrawlerJob(job.id, {
    status: completed ? "completed" : "queued",
    phase: completed ? "complete" : "process",
    target_cursor: cursor,
    scraped_count: scraped,
    ai_generated_count: aiGenerated,
    pending_review_count: pendingReview,
    failed_count: failed,
    message: completed
      ? `Tamamlandı. ${pendingReview.toLocaleString("tr-TR")} oyun inceleme kuyruğuna hazırlandı.`
      : `${cursor} / ${job.targets.length} oyun işlendi; iş arka planda devam ediyor.`,
    error_message: null,
    completed_at: completed ? new Date().toISOString() : null,
    locked_at: null,
    worker_id: null,
  });
}

function uniqueTargets(items: GameImportQueueItem[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function toCrawlerTarget(item: GameImportQueueItem): CrawlerTarget {
  return { id: item.id, sourceUrl: item.source_url, sourceDomain: item.source_domain };
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

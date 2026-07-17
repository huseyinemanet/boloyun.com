"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateGameContent } from "@/import/ai/generate-game-content";
import { insertNewDiscoveredImports, markImportFailed, markImportPendingReview, markImportScraped } from "@/import/db/game-imports";
import { scrapeGame } from "@/import/scrape/scrape-game";
import { discoverGameUrls } from "@/import/sitemap/discover";
import { requireAdmin } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function crawlNewGamesAction(formData: FormData) {
  const admin = await requireAdmin();
  const sitemapUrl = String(formData.get("sitemap_url") ?? "https://www.miniplay.com/sitemap.xml");
  const discoverLimit = parsePositiveInt(String(formData.get("discover_limit") ?? "100"), 100);
  const rawScrapeLimit = String(formData.get("scrape_limit") ?? "");
  const shouldScrape = formData.get("scrape_now") === "on";

  const discovered = await discoverGameUrls(sitemapUrl, discoverLimit);
  const insertResult = await insertNewDiscoveredImports(discovered);
  const scrapeLimit = rawScrapeLimit.trim() ? parsePositiveInt(rawScrapeLimit, insertResult.inserted.length) : insertResult.inserted.length;
  const scrapeTargets = shouldScrape ? insertResult.inserted.slice(0, scrapeLimit) : [];
  let scrapedCount = 0;
  let aiGeneratedCount = 0;
  let pendingReviewCount = 0;
  let failedCount = 0;

  for (const item of scrapeTargets) {
    try {
      const parsed = await scrapeGame(item.source_url, "miniplay");
      await markImportScraped(item.id, parsed);
      scrapedCount += 1;
      const generated = await generateGameContent(parsed);
      await markImportPendingReview(item.id, parsed, generated);
      aiGeneratedCount += 1;
      pendingReviewCount += 1;
    } catch (error) {
      try {
        await markImportFailed(item.id, error instanceof Error ? error.message : "Bilinmeyen hata");
      } catch {
        // The streaming route is the primary path; keep the legacy action moving item by item.
      }
      failedCount += 1;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/crawler");
  await recordAdminAudit({
    actorProfileId: admin.id,
    action: "crawler.run",
    targetType: "crawler",
    details: { sourceUrl: sitemapUrl, discovered: insertResult.discovered, pendingReview: pendingReviewCount, failed: failedCount },
  }).catch((error) => console.error("[crawler] audit failed", error));

  const params = new URLSearchParams({
    discovered: String(insertResult.discovered),
    inserted: String(insertResult.insertedCount),
    skipped: String(insertResult.skippedCount),
    scraped: String(scrapedCount),
    aiGenerated: String(aiGeneratedCount),
    pendingReview: String(pendingReviewCount),
    failed: String(failedCount),
  });

  redirect(`/admin/crawler?${params.toString()}`);
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), 100_000);
}

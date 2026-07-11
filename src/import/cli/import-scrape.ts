import { scrapeGame } from "@/import/scrape/scrape-game";
import { getImportsByStatus, markImportFailed, markImportScraped, type GameImportStatus } from "@/import/db/game-imports";
import { loadImportEnv } from "@/import/env";
import { getArg, getLimit, hasFlag } from "./args";

async function main() {
  loadImportEnv();

  const source = getArg("--source", "miniplay");
  const limit = getLimit(100);
  const dryRun = hasFlag("--dry-run");
  const status = (getArg("--status", "discovered") ?? "discovered") as GameImportStatus;
  const urls = process.argv.filter((arg) => arg.startsWith("http")).slice(0, limit);

  if (urls.length === 0) {
    const results = [];
    const queue = await getImportsByStatus(status, limit);

    for (const item of queue) {
      try {
        const parsed = await scrapeGame(item.source_url, source);
        if (!dryRun) {
          await markImportScraped(item.id, parsed);
        }
        results.push({
          sourceUrl: item.source_url,
          import_status: dryRun ? "dry_run" : "scraped",
          detectedGameType: parsed.detectedGameType,
          title: parsed.originalTitle,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bilinmeyen hata";
        if (!dryRun) {
          await markImportFailed(item.id, message);
        }
        results.push({ sourceUrl: item.source_url, import_status: dryRun ? "dry_run_failed" : "failed", error_message: message });
      }
    }

    console.log(JSON.stringify({ source, status, limit, count: results.length, results }, null, 2));
    return;
  }

  const results = [];
  for (const url of urls) {
    try {
      results.push(summarizeParsed(await scrapeGame(url, source)));
    } catch (error) {
      results.push({ sourceUrl: url, import_status: "failed", error_message: error instanceof Error ? error.message : "Bilinmeyen hata" });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

function summarizeParsed(parsed: Awaited<ReturnType<typeof scrapeGame>>) {
  return {
    sourceUrl: parsed.sourceUrl,
    sourceDomain: parsed.sourceDomain,
    originalTitle: parsed.originalTitle,
    originalDescription: parsed.originalDescription,
    originalHowToPlay: parsed.originalHowToPlay,
    originalControls: parsed.originalControls,
    originalCategories: parsed.originalCategories,
    originalTags: parsed.originalTags,
    thumbnailUrl: parsed.thumbnailUrl,
    detectedGameType: parsed.detectedGameType,
    detectedEmbedUrl: parsed.detectedEmbedUrl,
    detectedSwfUrl: parsed.detectedSwfUrl,
    detectedHtml5Url: parsed.detectedHtml5Url,
    detectedExternalUrl: parsed.detectedExternalUrl,
    rawHtmlSnapshotBytes: parsed.rawHtmlSnapshot?.length ?? 0,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

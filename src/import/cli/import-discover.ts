import { discoverGameUrls } from "@/import/sitemap/discover";
import { insertDiscoveredImports } from "@/import/db/game-imports";
import { loadImportEnv } from "@/import/env";
import { getArg, getLimit, hasFlag } from "./args";

async function main() {
  loadImportEnv();

  const sitemapUrl = process.argv.find((arg) => arg.startsWith("http"));
  const dryRun = hasFlag("--dry-run");

  if (!sitemapUrl) {
    throw new Error("Kullanim: pnpm import:discover <sitemap-url> --limit 50 [--dry-run]");
  }

  const urls = await discoverGameUrls(sitemapUrl, getLimit(50));

  if (dryRun) {
    console.log(JSON.stringify({ status: "dry_run", count: urls.length, urls }, null, 2));
    return;
  }

  const result = await insertDiscoveredImports(urls);
  console.log(JSON.stringify({
    status: "discovered",
    sitemapUrl,
    count: urls.length,
    processed: result.processed,
    note: "URL'ler game_imports tablosuna discovered status ile yazildi. Mevcut source_url kayitlari korunur.",
    sample: urls.slice(0, Number(getArg("--sample", "10"))),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

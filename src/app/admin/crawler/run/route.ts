import { revalidatePath } from "next/cache";
import {
  getDiscoveredImportsBySourceUrls,
  insertNewDiscoveredImports,
  markImportFailed,
  markImportScraped,
  type GameImportQueueItem,
} from "@/import/db/game-imports";
import { scrapeGame } from "@/import/scrape/scrape-game";
import { discoverGameUrls } from "@/import/sitemap/discover";
import { getCurrentProfile } from "@/lib/auth";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CrawlerStats = {
  requested: number;
  limit: number;
  discovered: number;
  duplicateChecked: number;
  inserted: number;
  skipped: number;
  pendingDiscovered: number;
  scrapeLimit: number;
  scraped: number;
  failed: number;
};

const MAX_DISCOVER_LIMIT = 5_000;
const MAX_SCRAPE_LIMIT = 500;

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return Response.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  if (profile.role !== "admin" || profile.status !== "active") return Response.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  if (!hasTrustedMutationOrigin(request)) return Response.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  let parsedBody: unknown;
  try { parsedBody = await request.json(); } catch { return Response.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 }); }
  const body = isRecord(parsedBody) ? parsedBody : {};
  const sitemapUrl = String(body.sitemapUrl || "https://www.miniplay.com/sitemap.xml").trim();
  const requested = parsePositiveInt(body.discoverLimit, 100);
  const limit = clamp(requested, 1, MAX_DISCOVER_LIMIT);
  const requestedScrapeLimit = parseScrapeLimit(body.scrapeLimit);
  const scrapeLimit = requestedScrapeLimit === "all" ? "all" : clamp(requestedScrapeLimit, 0, MAX_SCRAPE_LIMIT);
  const shouldScrape = Boolean(body.scrapeNow);

  const encoder = new TextEncoder();
  const operationAbort = new AbortController();
  request.signal.addEventListener("abort", () => operationAbort.abort(), { once: true });
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: CrawlerEvent) => {
        if (!operationAbort.signal.aborted) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void runCrawler({
        sitemapUrl,
        shouldScrape,
        scrapeLimit,
        stats: {
          requested,
          limit,
          discovered: 0,
          duplicateChecked: 0,
          inserted: 0,
          skipped: 0,
          pendingDiscovered: 0,
          scrapeLimit: shouldScrape && scrapeLimit !== "all" ? scrapeLimit : 0,
          scraped: 0,
          failed: 0,
        },
        send,
        signal: operationAbort.signal,
      }).finally(() => { if (!operationAbort.signal.aborted) controller.close(); });
    },
    cancel() { operationAbort.abort(); },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type CrawlerEvent =
  | {
      type: "progress";
      phase: "discover" | "duplicates" | "insert" | "pending" | "scrape" | "complete";
      message: string;
      stats: CrawlerStats;
    }
  | {
      type: "done";
      ok: boolean;
      message: string;
      stats: CrawlerStats;
    };

async function runCrawler({
  sitemapUrl,
  shouldScrape,
  scrapeLimit,
  stats,
  send,
  signal,
}: {
  sitemapUrl: string;
  shouldScrape: boolean;
  scrapeLimit: number | "all";
  stats: CrawlerStats;
  send: (event: CrawlerEvent) => void;
  signal: AbortSignal;
}) {
  try {
    send({
      type: "progress",
      phase: "discover",
      message: `Sitemap okunuyor. İstenen: ${stats.requested.toLocaleString("tr-TR")}, uygulanacak limit: ${stats.limit.toLocaleString("tr-TR")}.`,
      stats,
    });

    const discovered = await discoverGameUrls(sitemapUrl, stats.limit, (progress) => {
      stats.discovered = progress.discovered;
      send({
        type: "progress",
        phase: "discover",
        message: `${progress.discovered.toLocaleString("tr-TR")} oyun URL'i bulundu. Sırada ${progress.queuedSitemaps.toLocaleString("tr-TR")} sitemap var.`,
        stats,
      });
    }, signal);

    stats.discovered = discovered.length;
    send({
      type: "progress",
      phase: "duplicates",
      message: "Mevcut kayıtlar kontrol ediliyor.",
      stats,
    });

    const insertResult = await insertNewDiscoveredImports(discovered, (progress) => {
      if (progress.phase === "duplicates") {
        stats.duplicateChecked = progress.checked ?? stats.duplicateChecked;
        send({
          type: "progress",
          phase: "duplicates",
          message: `${stats.duplicateChecked.toLocaleString("tr-TR")} / ${(progress.total ?? discovered.length).toLocaleString("tr-TR")} URL duplicate kontrolünden geçti.`,
          stats,
        });
        return;
      }

      stats.inserted = progress.inserted ?? stats.inserted;
      stats.skipped = progress.skipped ?? stats.skipped;
      send({
        type: "progress",
        phase: "insert",
        message: `${stats.inserted.toLocaleString("tr-TR")} yeni URL eklendi, ${stats.skipped.toLocaleString("tr-TR")} URL zaten vardı.`,
        stats,
      });
    });

    stats.inserted = insertResult.insertedCount;
    stats.skipped = insertResult.skippedCount;

    let pendingDiscovered: GameImportQueueItem[] = [];
    if (shouldScrape) {
      const remainingLimit = scrapeLimit === "all" ? discovered.length : Math.max(0, scrapeLimit - insertResult.inserted.length);
      pendingDiscovered = await getDiscoveredImportsBySourceUrls(
        discovered.map((item) => item.sourceUrl),
        remainingLimit,
        (progress) => {
          stats.pendingDiscovered = progress.found;
          send({
            type: "progress",
            phase: "pending",
            message: `${progress.found.toLocaleString("tr-TR")} mevcut discovered kayıt scrape kuyruğuna alındı. Kontrol: ${progress.checked.toLocaleString("tr-TR")} / ${progress.total.toLocaleString("tr-TR")}.`,
            stats,
          });
        },
      );
    }

    const availableScrapeTargets = uniqueById([...insertResult.inserted, ...pendingDiscovered]);
    const effectiveScrapeLimit = scrapeLimit === "all" ? availableScrapeTargets.length : scrapeLimit;
    stats.scrapeLimit = shouldScrape ? effectiveScrapeLimit : 0;
    const scrapeTargets = shouldScrape ? availableScrapeTargets.slice(0, effectiveScrapeLimit) : [];
    if (scrapeTargets.length === 0) {
      send({
        type: "progress",
        phase: "complete",
        message: shouldScrape ? "Scrape edilecek yeni kayıt yok." : "Scrape kapalı, keşif tamamlandı.",
        stats,
      });
    }

    for (const [index, item] of scrapeTargets.entries()) {
      if (signal.aborted) throw new Error("Crawler işlemi iptal edildi.");
      send({
        type: "progress",
        phase: "scrape",
        message: `${index + 1} / ${scrapeTargets.length} scrape ediliyor: ${item.source_url}`,
        stats,
      });

      try {
        const parsed = await scrapeGame(item.source_url, "miniplay", signal);
        await markImportScraped(item.id, parsed);
        stats.scraped += 1;
      } catch (error) {
        await markImportFailed(item.id, error instanceof Error ? error.message : "Bilinmeyen hata");
        stats.failed += 1;
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/crawler");
    revalidatePath("/admin/imports");

    send({
      type: "done",
      ok: true,
      message: `Tamamlandı. ${stats.discovered.toLocaleString("tr-TR")} URL tarandı.`,
      stats,
    });
  } catch (error) {
    if (signal.aborted) return;
    send({
      type: "done",
      ok: false,
      message: error instanceof Error ? error.message : "Crawler çalışırken bilinmeyen bir hata oluştu.",
      stats,
    });
  }
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function parseScrapeLimit(value: unknown) {
  if (value === "all" || value === "" || value === null || typeof value === "undefined") {
    return "all" as const;
  }

  return parsePositiveInt(value, MAX_SCRAPE_LIMIT);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

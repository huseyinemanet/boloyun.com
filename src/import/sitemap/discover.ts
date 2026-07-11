export type DiscoveredGameUrl = {
  sourceUrl: string;
  sourceDomain: string;
  lastmod?: string;
};

export type DiscoverProgress = {
  currentSitemap?: string;
  discovered: number;
  queuedSitemaps: number;
};

export async function discoverGameUrls(
  sitemapUrl: string,
  limit = 50,
  onProgress?: (progress: DiscoverProgress) => void | Promise<void>,
  signal?: AbortSignal,
): Promise<DiscoveredGameUrl[]> {
  const seen = new Map<string, DiscoveredGameUrl>();
  const queue = [sitemapUrl];
  const rootHost = new URL(sitemapUrl).hostname;
  const queued = new Set(queue);
  const maxSitemaps = 250;
  let processedSitemaps = 0;

  while (queue.length > 0 && seen.size < limit) {
    const nextUrl = queue.shift();
    if (!nextUrl) continue;

    if (signal?.aborted) throw new Error("Crawler işlemi iptal edildi.");
    processedSitemaps += 1;
    if (processedSitemaps > maxSitemaps) throw new Error("Sitemap sayısı güvenli sınırı aşıyor.");
    const response = await safeExternalFetch(nextUrl, { signal });
    if (!response.ok) {
      throw new Error(`Sitemap okunamadi: ${nextUrl}`);
    }

    const xml = await readExternalText(response, 5 * 1024 * 1024);

    if (xml.includes("<sitemapindex")) {
      for (const sitemap of readSitemapLocs(xml)) {
        const parsed = new URL(sitemap, nextUrl);
        if (parsed.hostname !== rootHost || queued.has(parsed.toString())) continue;
        queued.add(parsed.toString());
        queue.push(parsed.toString());
      }
      await onProgress?.({ currentSitemap: nextUrl, discovered: seen.size, queuedSitemaps: queue.length });
      continue;
    }

    for (const item of readUrlItems(xml)) {
      if (item.loc.endsWith(".xml")) {
        const parsed = new URL(item.loc, nextUrl);
        if (parsed.hostname === rootHost && !queued.has(parsed.toString())) {
          queued.add(parsed.toString());
          queue.push(parsed.toString());
        }
        continue;
      }

      if (isLikelyGameUrl(item.loc)) {
        const url = new URL(item.loc);
        seen.set(item.loc, {
          sourceUrl: item.loc,
          sourceDomain: url.hostname,
          lastmod: item.lastmod,
        });

        if (seen.size % 250 === 0) {
          await onProgress?.({ currentSitemap: nextUrl, discovered: seen.size, queuedSitemaps: queue.length });
        }
      }

      if (seen.size >= limit) break;
    }

    await onProgress?.({ currentSitemap: nextUrl, discovered: seen.size, queuedSitemaps: queue.length });
  }

  return [...seen.values()];
}

function isLikelyGameUrl(url: string) {
  return /\/(game|games|juego|juegos|oyun)\//i.test(url) || /miniplay\.com\/game\//i.test(url);
}

function readSitemapLocs(xml: string) {
  return [...xml.matchAll(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g)].map((match) => match[1].trim());
}

function readUrlItems(xml: string) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    return {
      loc: block.match(/<loc>(.*?)<\/loc>/)?.[1].trim() ?? "",
      lastmod: block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1].trim(),
    };
  }).filter((item) => item.loc);
}
import { readExternalText, safeExternalFetch } from "@/import/security/safe-fetch";

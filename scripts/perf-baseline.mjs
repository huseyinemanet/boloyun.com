const defaultUrls = [
  "https://boloyun.com/",
  "https://boloyun.com/kategori/2-kisilik-oyunlar",
  "https://boloyun.com/oyun/mini-juegos-olimpicos",
  "https://boloyun.com/arama?q=araba",
  "https://boloyun.com/giris",
  "https://boloyun.com/_next/static/chunks/1vpmbl4hekwi8.css",
  "https://boloyun.com/logo.svg",
];

const urls = process.argv.slice(2);
const targets = urls.length ? urls : defaultUrls;

for (const url of targets) {
  const startedAt = performance.now();
  const response = await fetch(url, {
    headers: {
      "User-Agent": "BolOyun perf-baseline/1.0",
    },
  });
  const firstByteAt = performance.now();
  const body = await response.arrayBuffer();
  const completedAt = performance.now();

  console.log(JSON.stringify({
    url,
    status: response.status,
    bytes: body.byteLength,
    ttfbMs: Math.round(firstByteAt - startedAt),
    totalMs: Math.round(completedAt - startedAt),
    cacheControl: response.headers.get("cache-control"),
    cfCacheStatus: response.headers.get("cf-cache-status"),
    contentType: response.headers.get("content-type"),
  }));
}

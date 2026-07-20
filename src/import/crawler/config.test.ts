import assert from "node:assert/strict";
import test from "node:test";
import { MAX_CRAWLER_DISCOVER_LIMIT, MAX_CRAWLER_SCRAPE_LIMIT, parseCrawlerJobInput } from "./config";

test("crawler input güvenli limitlere sıkıştırılır", () => {
  const input = parseCrawlerJobInput({ discoverLimit: "100000", scrapeLimit: "100000", scrapeNow: true }, "profile-id");
  assert.equal(input.discoverLimit, MAX_CRAWLER_DISCOVER_LIMIT);
  assert.equal(input.scrapeLimit, MAX_CRAWLER_SCRAPE_LIMIT);
  assert.equal(input.scrapeNow, true);
});

test("boş scrape limiti kontrollü tüm-hedef davranışını seçer", () => {
  const input = parseCrawlerJobInput({ discoverLimit: "100", scrapeLimit: "" }, "profile-id");
  assert.equal(input.scrapeLimit, null);
  assert.equal(input.discoverLimit, 100);
});

test("crawler yalnız HTTPS sitemap kabul eder", () => {
  assert.throws(() => parseCrawlerJobInput({ sitemapUrl: "http://example.com/sitemap.xml" }, "profile-id"), /HTTPS/);
});

import type { SitemapRecord } from "@/lib/db-seo";
import { absoluteUrl } from "@/lib/seo/metadata";

import { cacheControl } from "@/lib/cache-policy";

export const SITEMAP_CACHE_CONTROL = cacheControl("sitemap");

export function sitemapIndex(urls: string[]) {
  const items = urls.map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`;
}

export function sitemapUrlSet(records: SitemapRecord[], canonicalDomain: string, includeHome = false) {
  const home = includeHome
    ? `<url><loc>${escapeXml(absoluteUrl("/", canonicalDomain))}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`
    : "";
  const items = records.map((record) => {
    const lastModified = record.updatedAt ? `<lastmod>${escapeXml(new Date(record.updatedAt).toISOString())}</lastmod>` : "";
    return `<url><loc>${escapeXml(absoluteUrl(record.path, canonicalDomain))}</loc>${lastModified}<changefreq>${frequency(record.kind)}</changefreq><priority>${priority(record.kind)}</priority></url>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${home}${items}</urlset>`;
}

export function xmlResponse(xml: string, status = 200) {
  return new Response(xml, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  })[character] ?? character);
}

function frequency(kind: SitemapRecord["kind"]) {
  if (kind === "category") return "daily";
  if (kind === "static") return "monthly";
  return "weekly";
}

function priority(kind: SitemapRecord["kind"]) {
  if (kind === "category") return "0.9";
  if (kind === "game") return "0.8";
  if (kind === "tag") return "0.6";
  return "0.4";
}

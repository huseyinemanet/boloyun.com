import type { MetadataRoute } from "next";
import { getSitemapRecords } from "@/lib/db-seo";
import { absoluteUrl } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ seo }, records] = await Promise.all([getPublicSettings(), getSitemapRecords()]);
  if (!seo.sitemapEnabled) return [];
  const visibleRecords = records.filter((record) => (record.kind !== "tag" || seo.sitemapIncludeTags) && (record.kind !== "static" || seo.sitemapIncludeStaticPages));
  return [
    { url: absoluteUrl("/", seo.canonicalDomain), lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...visibleRecords.map((record) => ({
      url: absoluteUrl(record.path, seo.canonicalDomain),
      lastModified: record.updatedAt ? new Date(record.updatedAt) : new Date(),
      changeFrequency: frequency(record.kind),
      priority: priority(record.kind),
    })),
  ];
}

function frequency(kind: "game" | "category" | "tag" | "static"): "daily" | "weekly" | "monthly" {
  if (kind === "category") return "daily";
  if (kind === "static") return "monthly";
  return "weekly";
}

function priority(kind: "game" | "category" | "tag" | "static") {
  if (kind === "category") return 0.9;
  if (kind === "game") return 0.8;
  if (kind === "tag") return 0.6;
  return 0.4;
}

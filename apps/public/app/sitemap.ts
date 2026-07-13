import type { MetadataRoute } from "next";
import { getSitemapRecords } from "@public/lib/data";
import { absoluteUrl } from "@public/lib/seo";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const records = await getSitemapRecords();
  return records.map((record) => ({
    url: absoluteUrl(record.path),
    changeFrequency: record.changefreq as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: Number(record.priority),
    lastModified: new Date(),
  }));
}

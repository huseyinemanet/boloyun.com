import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await getPublicSettings();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: seo.robotsDisallow,
    },
    sitemap: seo.sitemapEnabled ? absoluteUrl("/sitemap.xml", seo.canonicalDomain) : undefined,
    host: seo.canonicalDomain || SITE_URL,
  };
}

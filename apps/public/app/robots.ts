import type { MetadataRoute } from "next";
import { SITE_URL } from "@public/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/oyun/", "/kategori/", "/etiket/", "/sayfa/", "/arama"],
      disallow: ["/admin", "/api", "/auth", "/profil"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

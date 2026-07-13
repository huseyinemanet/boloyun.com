import { getSitemapRecords } from "@public/lib/data";
import { absoluteUrl } from "@public/lib/seo";

export const dynamic = "force-static";

export async function GET() {
  const records = (await getSitemapRecords()).filter((record) => !record.path.startsWith("/oyun/"));
  return new Response(toXml(records), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
    },
  });
}

function toXml(records: Array<{ path: string; priority: string; changefreq: string }>) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${records.map((record) => `  <url><loc>${absoluteUrl(record.path)}</loc><changefreq>${record.changefreq}</changefreq><priority>${record.priority}</priority></url>`).join("\n")}\n</urlset>`;
}

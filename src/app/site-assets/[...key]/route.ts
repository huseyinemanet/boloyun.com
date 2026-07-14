import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSiteAssetStorageKey } from "@/lib/site-assets";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const storageKey = getSiteAssetStorageKey(key ?? []);
  if (!storageKey) return new Response("Not found", { status: 404 });

  const { env } = await getCloudflareContext({ async: true });
  if (!env.SITE_ASSETS) return new Response("Asset storage unavailable", { status: 503 });

  const object = await env.SITE_ASSETS.get(storageKey);
  if (!object?.body) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");

  return new Response(object.body, { headers });
}

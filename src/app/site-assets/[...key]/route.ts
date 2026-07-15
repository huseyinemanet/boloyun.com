import { getSiteAssetObject } from "@/lib/r2";
import { getSiteAssetStorageKey } from "@/lib/site-assets";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const storageKey = getSiteAssetStorageKey(key ?? []);
  if (!storageKey) return new Response("Not found", { status: 404 });

  const object = await getSiteAssetObject(storageKey);
  if (!object) return assetFallback(key[0], request);

  const headers = new Headers();
  headers.set("content-type", object.contentType);
  headers.set("cache-control", object.cacheControl);
  headers.set("x-content-type-options", "nosniff");

  return new Response(object.body, { headers });
}

function assetFallback(kind: string | undefined, request: Request) {
  if (kind === "avatar") {
    return Response.redirect(publicUrl(request, "/thumbnails/puzzle.svg"), 302);
  }
  if (kind === "cover") {
    return Response.redirect(publicUrl(request, "/thumbnails/space.svg"), 302);
  }

  return new Response("Not found", { status: 404 });
}

function publicUrl(request: Request, pathname: string) {
  const url = new URL(pathname, request.url);
  url.protocol = "https:";
  return url;
}

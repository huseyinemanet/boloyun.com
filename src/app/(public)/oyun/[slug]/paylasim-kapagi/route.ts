import sharp from "sharp";
import { getPublicSettings } from "@/lib/db-settings";
import { getPublicGamePageBySlug } from "@/lib/games/public-queries";
import { absoluteUrl } from "@/lib/seo/metadata";

export const revalidate = 3600;

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([
    getPublicGamePageBySlug(slug),
    getPublicSettings(),
  ]);

  if (!detail) {
    return new Response("Oyun bulunamadı.", { status: 404 });
  }

  const sourceUrl = absoluteUrl(detail.game.thumbnailUrl, settings.seo.canonicalDomain);

  try {
    const source = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 3600 },
    });
    if (!source.ok) throw new Error(`Kapak görseli alınamadı (${source.status}).`);

    const image = await sharp(Buffer.from(await source.arrayBuffer()))
      .resize(800, 600, { fit: "cover", position: "centre" })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer();

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(image.byteLength),
        "Content-Disposition": `inline; filename="${safeFilename(slug)}.jpg"`,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return Response.redirect(absoluteUrl(settings.seo.openGraphImageUrl, settings.seo.canonicalDomain), 307);
  }
}

function safeFilename(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "oyun-kapagi";
}

import sharp from "sharp";
import { getPublicGamePageBySlug } from "@/lib/games/public-queries";
import { absoluteUrl } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";

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

  const sourceUrl = absoluteUrl(
    detail.game.ogImageUrl || detail.game.thumbnailUrl || settings.seo.openGraphImageUrl,
    settings.seo.canonicalDomain,
  );

  try {
    const source = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 3600 },
    });

    if (!source.ok) {
      throw new Error(`Kapak görseli alınamadı (${source.status}).`);
    }

    const input = Buffer.from(await source.arrayBuffer());
    const image = await sharp(input)
      .resize(1200, 630, { fit: "cover", position: "centre" })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer();

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return Response.redirect(absoluteUrl(settings.seo.openGraphImageUrl, settings.seo.canonicalDomain), 307);
  }
}

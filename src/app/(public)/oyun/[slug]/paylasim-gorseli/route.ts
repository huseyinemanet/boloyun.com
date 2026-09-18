import { getPublishedGameDetailBySlug } from "@/lib/games/public-queries";
import { absoluteUrl } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";
import { createRemoteSocialImage, SocialImageBusyError } from "@/lib/security/social-image";

export const revalidate = 3600;

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([
    getPublishedGameDetailBySlug(slug),
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
    const image = await createRemoteSocialImage(sourceUrl, 1200, 630);

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    return new Response(null, {
      status: 307,
      headers: {
        Location: absoluteUrl("/opengraph-image", settings.seo.canonicalDomain),
        "Cache-Control": "public, max-age=60, s-maxage=300",
        ...(error instanceof SocialImageBusyError ? { "Retry-After": "1" } : {}),
      },
    });
  }
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { GameSection } from "@/components/game/game-section";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicTagBySlug, getPublishedGamesByTagSlugPage } from "@/lib/db-tags";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";

const PER_PAGE = 60;

export async function getTagMetadata(slug: string, page: number): Promise<Metadata> {
  const [tag, settings] = await Promise.all([getPublicTagBySlug(slug), getPublicSettings()]);
  if (!tag) return {};
  const baseTitle = tag.seo_title || `${tag.name} Oyunları Oyna`;
  const title = page > 1 ? `${baseTitle} - Sayfa ${page}` : baseTitle;
  const description = tag.seo_description || tag.description || `${tag.name} etiketindeki ücretsiz tarayıcı oyunlarını keşfet ve hemen oyna.`;
  return buildMetadata({
    title,
    description,
    canonicalPath: page > 1 ? `/etiket/${slug}/sayfa/${page}` : `/etiket/${slug}`,
    image: tag.og_image_url,
    indexable: tag.effectiveIndexable,
    siteName: settings.general.siteName,
    baseUrl: settings.seo.canonicalDomain,
    defaultImage: settings.seo.openGraphImageUrl,
  });
}

export async function TagView({ slug, page }: { slug: string; page: number }) {
  const [tag, tagGames, settings] = await Promise.all([
    getPublicTagBySlug(slug),
    getPublishedGamesByTagSlugPage({ slug, page, perPage: PER_PAGE }),
    getPublicSettings(),
  ]);
  if (!tag || page < 1 || (page > 1 && tagGames.items.length === 0)) notFound();
  const path = page > 1 ? `/etiket/${slug}/sayfa/${page}` : `/etiket/${slug}`;

  return (
    <div className="space-y-4">
      {settings.seo.structuredDataEnabled ? <JsonLd data={[
        breadcrumbJsonLd([{ name: "Ana Sayfa", path: "/" }, { name: tag.name, path }]),
        itemListJsonLd(`${tag.name} oyunları`, tagGames.items.map((game) => `/oyun/${game.slug}`)),
      ]} /> : null}
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-semibold">{tag.name} Oyunları{page > 1 ? ` - Sayfa ${page}` : ""}</h1>
        {tag.description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{tag.description}</p> : null}
      </section>
      {tagGames.items.length ? (
        <>
          <AdminPagination currentPage={page} perPage={PER_PAGE} total={tagGames.total} basePath={`/etiket/${slug}`} itemName="oyun" pathStyle="segment" />
          <GameSection title={`${tag.name} Oyunları`} games={tagGames.items} eagerCount={4} />
          <AdminPagination currentPage={page} perPage={PER_PAGE} total={tagGames.total} basePath={`/etiket/${slug}`} itemName="oyun" pathStyle="segment" />
        </>
      ) : (
        <section className="rounded-md border border-border bg-card p-6 text-sm font-semibold text-muted-foreground">Bu etikette henüz yayınlanmış oyun yok.</section>
      )}
    </div>
  );
}

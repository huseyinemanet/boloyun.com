import type { Metadata } from "next";
import { SoundLink } from "@/components/audio/sound-link";
import { notFound } from "next/navigation";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { GameSection } from "@/components/game/game-section";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicCategories, getPublicCategoryBySlug } from "@/lib/db-categories";
import { AdSlot } from "@/components/ads/ad-slot";
import { getPublishedGamesByCategorySlugPage } from "@/lib/db-games";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";
import { renderSeoTemplate } from "@/lib/settings/validation";

const PER_PAGE = 60;

export async function getCategoryMetadata(slug: string, page: number): Promise<Metadata> {
  const [category, settings] = await Promise.all([getPublicCategoryBySlug(slug), getPublicSettings()]);
  if (!category) return {};
  const baseTitle = category.seo_title || renderSeoTemplate(settings.seo.categoryTitleTemplate, { kategori_adı: category.name, site_adı: settings.general.siteName });
  const title = page > 1 ? `${baseTitle} - Sayfa ${page}` : baseTitle;
  const description = category.seo_description || category.description || renderSeoTemplate(settings.seo.categoryDescriptionTemplate, { kategori_adı: category.name, site_adı: settings.general.siteName });
  const canonicalPath = page > 1 ? `/kategori/${slug}/sayfa/${page}` : `/kategori/${slug}`;
  return buildMetadata({
    title,
    description,
    canonicalPath,
    image: category.og_image_url,
    indexable: category.is_indexable ?? true,
    siteName: settings.general.siteName,
    baseUrl: settings.seo.canonicalDomain,
    defaultImage: settings.seo.openGraphImageUrl,
  });
}

export async function CategoryView({ slug, page }: { slug: string; page: number }) {
  const [categoryGames, categories, settings] = await Promise.all([
    getPublishedGamesByCategorySlugPage({ slug, page, perPage: PER_PAGE }),
    getPublicCategories(18),
    getPublicSettings(),
  ]);
  const category = categoryGames.category ?? await getPublicCategoryBySlug(slug);
  if (!category || page < 1 || (page > 1 && categoryGames.items.length === 0)) notFound();

  const canonicalPath = page > 1 ? `/kategori/${slug}/sayfa/${page}` : `/kategori/${slug}`;
  return (
    <div className="space-y-4">
      {settings.seo.structuredDataEnabled ? <JsonLd data={[
        breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: category.name, path: canonicalPath },
        ]),
        itemListJsonLd(`${category.name}${page > 1 ? ` - Sayfa ${page}` : ""}`, categoryGames.items.map((game) => `/oyun/${game.slug}`)),
      ]} /> : null}
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-semibold">{category.name}{page > 1 ? ` - Sayfa ${page}` : ""}</h1>
        {category.description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{category.description}</p> : null}
      </section>
      <AdSlot slotKey="category_page_top" />
      {categoryGames.items.length ? (
        <>
          <AdminPagination currentPage={page} perPage={PER_PAGE} total={categoryGames.total} basePath={`/kategori/${slug}`} itemName="oyun" pathStyle="segment" />
          <GameSection title={category.name} games={categoryGames.items} eagerCount={4} />
          <AdminPagination currentPage={page} perPage={PER_PAGE} total={categoryGames.total} basePath={`/kategori/${slug}`} itemName="oyun" pathStyle="segment" />
        </>
      ) : (
        <section className="rounded-md border border-border bg-card p-6 text-sm font-semibold text-muted-foreground">Bu kategoride henüz yayınlanmış oyun yok.</section>
      )}
      <nav aria-label="İlgili kategoriler" className="rounded-md border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Diğer Oyun Kategorileri</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.filter((item) => item.slug !== slug).slice(0, 12).map((item) => (
            <SoundLink key={item.id} href={`/kategori/${item.slug}`} className="rounded-md bg-muted px-3 py-2 text-xs font-bold hover:bg-accent">{item.name}</SoundLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

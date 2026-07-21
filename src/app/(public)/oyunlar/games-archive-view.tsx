import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { GameSection } from "@/components/game/game-section";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicSettings } from "@/lib/db-settings";
import { getPublishedGamesPage } from "@/lib/games/public-queries";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

const PER_PAGE = 24;

export async function getGamesArchiveMetadata(page: number): Promise<Metadata> {
  const settings = await getPublicSettings();
  const title = page > 1 ? `Tüm Oyunlar - Sayfa ${page}` : "Tüm Oyunlar";
  return buildMetadata({
    title,
    description: "BolOyun arşivindeki ücretsiz oyunları keşfet; yeni, popüler ve klasik oyunlara sayfa sayfa göz at.",
    canonicalPath: archivePath(page),
    siteName: settings.general.siteName,
    baseUrl: settings.seo.canonicalDomain,
    defaultImage: settings.seo.openGraphImageUrl,
  });
}

export async function GamesArchiveView({ page }: { page: number }) {
  if (!Number.isInteger(page) || page < 1) notFound();
  const [games, settings] = await Promise.all([
    getPublishedGamesPage({ page, perPage: PER_PAGE }),
    getPublicSettings(),
  ]);
  if (page > 1 && games.items.length === 0) notFound();

  const title = page > 1 ? `Tüm Oyunlar - Sayfa ${page}` : "Tüm Oyunlar";
  const canonicalPath = archivePath(page);
  return (
    <div className="space-y-4">
      {settings.seo.structuredDataEnabled ? <JsonLd data={[
        breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: title, path: canonicalPath },
        ]),
        itemListJsonLd(title, games.items.map((game) => ({ name: game.title, path: `/oyun/${game.slug}` }))),
      ]} /> : null}
      <section>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
          Arşivdeki ücretsiz oyunları keşfet ve istediğin oyunu hemen oynamaya başla.
        </p>
      </section>
      {games.items.length ? <>
        <AdminPagination currentPage={page} perPage={PER_PAGE} total={games.total} basePath="/oyunlar" itemName="oyun" pathStyle="segment" variant="plain" />
        <GameSection title={title} games={games.items} eagerCount={1} />
        <AdminPagination currentPage={page} perPage={PER_PAGE} total={games.total} basePath="/oyunlar" itemName="oyun" pathStyle="segment" variant="plain" />
      </> : <p className="py-8 text-sm font-semibold text-muted-foreground">Henüz yayınlanmış oyun yok.</p>}
    </div>
  );
}

function archivePath(page: number) {
  return page > 1 ? `/oyunlar/sayfa/${page}` : "/oyunlar";
}

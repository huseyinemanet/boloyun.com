import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/ad-slot";
import { parseAdminPage } from "@/components/admin/admin-pagination";
import { GameSection } from "@/components/game/game-section";
import { getPublishedGames, getPublishedGamesPage } from "@/lib/db-games";
import { JsonLd } from "@/components/seo/json-ld";
import { itemListJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";
import { getHomepageSectionsPublic } from "@/lib/db-homepage-sections";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
const PER_PAGE = 60;

type HomeProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const page = parseAdminPage((await searchParams).page);
  const { general, seo } = await getPublicSettings();
  return buildMetadata({
    title: page > 1 ? `${seo.defaultTitle} - Sayfa ${page}` : seo.defaultTitle,
    description: page > 1 ? `${seo.defaultDescription} Oyun listesi, sayfa ${page}.` : seo.defaultDescription,
    canonicalPath: page > 1 ? `/?page=${page}` : "/",
    indexable: true,
    siteName: general.siteName,
    baseUrl: seo.canonicalDomain,
    defaultImage: seo.openGraphImageUrl,
  });
}

export default async function Home({ searchParams }: HomeProps) {
  const currentPage = parseAdminPage((await searchParams).page);
  const [publishedGames, allGames, settings, configuredSections, profile] = await Promise.all([
    getPublishedGames(80),
    getPublishedGamesPage({ page: currentPage, perPage: PER_PAGE }),
    getPublicSettings(),
    getHomepageSectionsPublic(),
    getCurrentProfile(),
  ]);
  const visibleConfiguredSections = configuredSections.filter(({ section }) => section.visibility !== "members" || Boolean(profile));
  const visibleGames = [...new Map(
    [...publishedGames.slice(0, 72), ...allGames.items].map((game) => [game.id, game]),
  ).values()];

  return (
    <div className="space-y-5">
      {settings.seo.structuredDataEnabled ? <JsonLd data={[websiteJsonLd(), organizationJsonLd(), itemListJsonLd(`${settings.general.siteName}'daki oyunlar`, visibleGames.map((game) => `/oyun/${game.slug}`))]} /> : null}
      <section className="overflow-hidden rounded-lg border border-border bg-card p-5 text-card-foreground">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-black sm:text-3xl">{settings.appearance.heroTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {settings.appearance.heroDescription}
          </p>
        </div>
      </section>

      <AdSlot slotKey="homepage_top_banner" />

      {visibleConfiguredSections.length ? visibleConfiguredSections.map(({ section, games }, index) => <div key={section.id ?? `${section.sectionType}-${index}`} className={section.visibility === "desktop" ? "hidden md:block" : section.visibility === "mobile" ? "md:hidden" : ""}><GameSection title={section.title} games={games} />{index > 0 && index % 2 === 1 ? <div className="mt-5"><AdSlot slotKey="homepage_between_sections" /></div> : null}</div>) : <>
        <div id="yeni-oyunlar" className="scroll-mt-24"><GameSection title="Yeni Oyunlar" games={publishedGames.slice(0, 24)} /></div>
        <div id="populer-oyunlar" className="scroll-mt-24"><GameSection title="Popüler Oyunlar" games={publishedGames.slice(24, 48)} /></div>
        <div id="trend-oyunlar" className="scroll-mt-24"><GameSection title="Trend Oyunlar" games={publishedGames.slice(48, 72)} /></div>
      </>}
      <GameSection title="Tüm Oyunlar" games={allGames.items} />
    </div>
  );
}

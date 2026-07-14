import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/ad-slot";
import { GameSection } from "@/components/game/game-section";
import { getPublishedGames } from "@/lib/db-games";
import { JsonLd } from "@/components/seo/json-ld";
import { itemListJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";
import { getHomepageSectionsPublic } from "@/lib/db-homepage-sections";

export const revalidate = 300;
const HOME_ALL_GAMES_LIMIT = 40;

export async function generateMetadata(): Promise<Metadata> {
  const { general, seo } = await getPublicSettings();
  return buildMetadata({
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    canonicalPath: "/",
    indexable: true,
    siteName: general.siteName,
    baseUrl: seo.canonicalDomain,
    defaultImage: seo.openGraphImageUrl,
  });
}

export default async function Home() {
  const [publishedGames, settings, configuredSections] = await Promise.all([
    getPublishedGames(80),
    getPublicSettings(),
    getHomepageSectionsPublic(),
  ]);
  const visibleConfiguredSections = configuredSections.filter(({ section }) => section.visibility !== "members");
  const allGames = publishedGames.slice(0, HOME_ALL_GAMES_LIMIT);
  const visibleGames = publishedGames.slice(0, 72);

  return (
    <div className="space-y-5">
      {settings.seo.structuredDataEnabled ? <JsonLd data={[websiteJsonLd(), organizationJsonLd(), itemListJsonLd(`${settings.general.siteName}'daki oyunlar`, visibleGames.map((game) => `/oyun/${game.slug}`))]} /> : null}
      <section className="py-4 text-card-foreground">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold sm:text-3xl">{settings.appearance.heroTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {settings.appearance.heroDescription}
          </p>
        </div>
      </section>

      <AdSlot slotKey="homepage_top_banner" />

      {visibleConfiguredSections.length ? visibleConfiguredSections.map(({ section, games }, index) => <div key={section.id ?? `${section.sectionType}-${index}`} className={section.visibility === "desktop" ? "hidden md:block" : section.visibility === "mobile" ? "md:hidden" : ""}><GameSection title={section.title} games={games} eagerCount={index === 0 ? 4 : 0} />{index > 0 && index % 2 === 1 ? <div className="mt-5"><AdSlot slotKey="homepage_between_sections" /></div> : null}</div>) : <>
        <div id="yeni-oyunlar" className="scroll-mt-24"><GameSection title="Yeni Oyunlar" games={publishedGames.slice(0, 24)} eagerCount={4} /></div>
        <div id="populer-oyunlar" className="scroll-mt-24"><GameSection title="Popüler Oyunlar" games={publishedGames.slice(24, 48)} /></div>
        <div id="trend-oyunlar" className="scroll-mt-24"><GameSection title="Trend Oyunlar" games={publishedGames.slice(48, 72)} /></div>
      </>}
      <GameSection title="Tüm Oyunlar" games={allGames} />
    </div>
  );
}

import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/ad-slot";
import { GameSection } from "@/components/game/game-section";
import { JsonLd } from "@/components/seo/json-ld";
import { itemListJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";
import { getPublicHomepageSnapshot } from "@/lib/db-homepage-sections";

export const revalidate = 3600;
const HOME_ALL_GAMES_LIMIT = 20;
const HOME_SECTION_LIMIT = 12;

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
  const [homepage, settings] = await Promise.all([
    getPublicHomepageSnapshot(),
    getPublicSettings(),
  ]);
  const visibleConfiguredSections = homepage.sections.filter(({ section }) => section.visibility !== "members");
  const seenGameIds = new Set<string>();
  const deduplicatedSections = visibleConfiguredSections.map(({ section, games }) => {
    const uniqueGames = games.filter((game) => {
      if (seenGameIds.has(game.id)) return false;
      seenGameIds.add(game.id);
      return true;
    }).slice(0, HOME_SECTION_LIMIT);
    return { section, games: uniqueGames };
  }).filter(({ games }) => games.length > 0);
  const allGames = homepage.latestGames.filter((game) => !seenGameIds.has(game.id)).slice(0, HOME_ALL_GAMES_LIMIT);
  const visibleGames = [...deduplicatedSections.flatMap(({ games }) => games), ...allGames];

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

      {deduplicatedSections.length ? deduplicatedSections.map(({ section, games }, index) => <div key={section.id ?? `${section.sectionType}-${index}`} className={section.visibility === "desktop" ? "hidden md:block" : section.visibility === "mobile" ? "md:hidden" : ""}><GameSection title={section.title} games={games} eagerCount={index === 0 ? 4 : 0} />{index > 0 && index % 2 === 1 ? <div className="mt-5"><AdSlot slotKey="homepage_between_sections" /></div> : null}</div>) : <>
        <div id="yeni-oyunlar" className="scroll-mt-24"><GameSection title="Yeni Oyunlar" games={homepage.latestGames.slice(0, 12)} eagerCount={4} /></div>
        <div id="populer-oyunlar" className="scroll-mt-24"><GameSection title="Popüler Oyunlar" games={homepage.popularGames} /></div>
        <div id="trend-oyunlar" className="scroll-mt-24"><GameSection title="Trend Oyunlar" games={homepage.latestGames.slice(24, 36)} /></div>
      </>}
      <GameSection title="Tüm Oyunlar" games={allGames} />
    </div>
  );
}

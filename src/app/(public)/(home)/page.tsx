import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/ad-slot";
import { SoundLink } from "@/components/audio/sound-link";
import { GameSection } from "@/components/game/game-section";
import { ContinuePlayingSection } from "@/components/game/continue-playing-section";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowRightIcon } from "@/components/icons/app-icons";
import { itemListJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";
import { getPublicHomepageSnapshot, HOMEPAGE_FEATURED_GAME_LIMIT } from "@/lib/db-homepage-sections";

export const revalidate = 3600;

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
  const visibleConfiguredSections = homepage.sections.filter(({ section }) =>
    section.visibility !== "members" && section.sectionType !== "continue_playing" && section.sectionType !== "favorites"
  );
  const seenGameIds = new Set<string>();
  const sourceSections = visibleConfiguredSections.length ? visibleConfiguredSections : [
    fallbackSection("Yeni Oyunlar", "latest_games", homepage.latestGames),
    fallbackSection("Popüler Oyunlar", "popular_games", homepage.popularGames),
    fallbackSection("Trend Oyunlar", "trending_games", homepage.trendingGames),
  ];
  const deduplicatedSections = sourceSections.map(({ section, games }) => ({
    section,
    games: takeUniqueGames(games, seenGameIds),
  })).filter(({ games }) => games.length > 0);
  const assignedSectionAnchors = new Set<string>();
  const anchoredSections = deduplicatedSections.map((entry) => {
    const anchor = homepageSectionAnchor(entry.section.sectionType);
    if (!anchor || assignedSectionAnchors.has(anchor)) return { ...entry, anchor: undefined };
    assignedSectionAnchors.add(anchor);
    return { ...entry, anchor };
  });

  return (
    <div className="space-y-5">
      {settings.seo.structuredDataEnabled ? <JsonLd data={[
        websiteJsonLd(),
        organizationJsonLd(),
        ...anchoredSections.map(({ section, games }) => itemListJsonLd(section.title, games.map((game) => ({ name: game.title, path: `/oyun/${game.slug}` })))),
      ]} /> : null}
      <section className="py-4 text-card-foreground">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold sm:text-3xl">{settings.appearance.heroTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {settings.appearance.heroDescription}
          </p>
        </div>
      </section>

      <AdSlot slotKey="homepage_top_banner" />

      <ContinuePlayingSection />

      {anchoredSections.map(({ section, games, anchor }, index) => <div id={anchor} key={section.id ?? `${section.sectionType}-${index}`} className={`${section.visibility === "desktop" ? "hidden md:block" : section.visibility === "mobile" ? "md:hidden" : ""} scroll-mt-24`}><GameSection title={section.title} games={games} eagerCount={index === 0 ? 1 : 0} />{index > 0 && index % 2 === 1 ? <div className="mt-5"><AdSlot slotKey="homepage_between_sections" /></div> : null}</div>)}
      <section aria-labelledby="tum-oyunlar-baslik" className="flex flex-col gap-3 border-t border-border py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="tum-oyunlar-baslik" className="text-xl font-semibold">Tüm Oyunlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Arşivdeki tüm oyunları sayfa sayfa keşfet.</p>
        </div>
        <SoundLink href="/oyunlar" className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90">
          Tümünü gör
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </SoundLink>
      </section>
    </div>
  );
}

function fallbackSection(title: string, sectionType: "latest_games" | "popular_games" | "trending_games", games: Awaited<ReturnType<typeof getPublicHomepageSnapshot>>["latestGames"]) {
  return {
    section: {
      id: null,
      title,
      sectionType,
      sourceType: "" as const,
      sourceId: "",
      manualGameIds: [],
      limitCount: HOMEPAGE_FEATURED_GAME_LIMIT,
      sortOrder: 0,
      visibility: "all" as const,
      status: "active" as const,
    },
    games,
  };
}

function takeUniqueGames<T extends { id: string }>(games: T[], seenGameIds: Set<string>) {
  const uniqueGames: T[] = [];
  for (const game of games) {
    if (seenGameIds.has(game.id)) continue;
    seenGameIds.add(game.id);
    uniqueGames.push(game);
    if (uniqueGames.length === HOMEPAGE_FEATURED_GAME_LIMIT) break;
  }
  return uniqueGames;
}

function homepageSectionAnchor(sectionType: string) {
  if (sectionType === "latest_games") return "yeni-oyunlar";
  if (sectionType === "popular_games") return "populer-oyunlar";
  if (sectionType === "trending_games") return "trend-oyunlar";
  return undefined;
}

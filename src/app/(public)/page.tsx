import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { AdminPagination, parseAdminPage } from "@/components/admin/admin-pagination";
import { GameSection } from "@/components/game/game-section";
import { getPublishedGames, getPublishedGamesPage } from "@/lib/db-games";
import { getPublicCategories } from "@/lib/db-categories";
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
  const [publishedGames, allGames, categories, settings, configuredSections, profile] = await Promise.all([
    getPublishedGames(80),
    getPublishedGamesPage({ page: currentPage, perPage: PER_PAGE }),
    getPublicCategories(12),
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
          <nav aria-label="Öne çıkan kategoriler" className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link key={category.id} href={`/kategori/${category.slug}`} className="rounded-md bg-muted px-3 py-2 text-xs font-bold text-foreground hover:bg-accent">
                {category.name}
              </Link>
            ))}
            <Link href="/rastgele" className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Rastgele Oyun</Link>
          </nav>
        </div>
      </section>

      <AdSlot slotKey="homepage_top_banner" />

      {visibleConfiguredSections.length ? visibleConfiguredSections.map(({ section, games }, index) => <div key={section.id ?? `${section.sectionType}-${index}`} className={section.visibility === "desktop" ? "hidden md:block" : section.visibility === "mobile" ? "md:hidden" : ""}><GameSection title={section.title} games={games} />{index > 0 && index % 2 === 1 ? <div className="mt-5"><AdSlot slotKey="homepage_between_sections" /></div> : null}</div>) : <>
        <nav aria-label="Oyun bölümleri" className="flex flex-wrap gap-3 text-sm font-bold"><a href="#yeni-oyunlar" className="text-primary hover:underline">Yeni Oyunlar</a><a href="#populer-oyunlar" className="text-primary hover:underline">Popüler Oyunlar</a><a href="#trend-oyunlar" className="text-primary hover:underline">Trend Oyunlar</a></nav>
        <div id="yeni-oyunlar" className="scroll-mt-24"><GameSection title="Yeni Oyunlar" games={publishedGames.slice(0, 24)} /></div>
        <div id="populer-oyunlar" className="scroll-mt-24"><GameSection title="Popüler Oyunlar" games={publishedGames.slice(24, 48)} /></div>
        <div id="trend-oyunlar" className="scroll-mt-24"><GameSection title="Trend Oyunlar" games={publishedGames.slice(48, 72)} /></div>
      </>}
      <AdminPagination currentPage={currentPage} perPage={PER_PAGE} total={allGames.total} basePath="/" itemName="oyun" />
      <GameSection title="Tüm Oyunlar" games={allGames.items} />
      <AdminPagination currentPage={currentPage} perPage={PER_PAGE} total={allGames.total} basePath="/" itemName="oyun" />
      <section className="rounded-md border border-border bg-card p-5 text-sm leading-7 text-muted-foreground">
        <h2 className="text-lg font-black text-foreground">{settings.general.siteName} ile tarayıcıdan hemen oyna</h2>
        <p className="mt-2">Her oyun sayfasında Türkçe açıklama, nasıl oynanır bilgisi ve kontroller bulunur. Oyun dosyası yalnızca sen başlatınca yüklenir; böylece sayfalar hızlı ve oyun keşfetmek kolay kalır.</p>
      </section>
    </div>
  );
}

import { GameSection } from "@/components/game/game-section";
import { AdSlot } from "@/components/ads/ad-slot";
import { searchPublishedGames } from "@/lib/games/public-queries";
import { getPublicSettings } from "@/lib/db-settings";
import type { Metadata } from "next";
import { AdminPagination, parseAdminPage } from "@/components/admin/admin-pagination";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getPublicSettings();
  return { title: "Oyun Ara", alternates: { canonical: "/arama" }, robots: seo.searchIndexable ? { index: true, follow: true } : { index: false, follow: true, googleBot: { index: false, follow: true } } };
}

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

const PER_PAGE = 24;

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page: pageParam } = await searchParams;
  const page = parseAdminPage(pageParam);
  const results = await searchPublishedGames(q, page, PER_PAGE);

  return (
    <div data-analytics-search-term={q || undefined} data-analytics-result-count={results.total} className="space-y-4">
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-semibold">Oyun Ara</h1>
        <p className="mt-2 text-sm text-muted-foreground">{q ? `"${q}" için ${results.total.toLocaleString("tr-TR")} sonuç bulundu.` : "Aramak istediğin oyunu yaz."}</p>
      </section>
      <AdSlot slotKey="search_results_top" />
      {results.total > PER_PAGE ? <AdminPagination currentPage={page} perPage={PER_PAGE} total={results.total} basePath="/arama" itemName="oyun" queryParams={{ q }} /> : null}
      <GameSection title="Arama Sonuçları" games={results.items} eagerCount={4} />
      {results.total > PER_PAGE ? <AdminPagination currentPage={page} perPage={PER_PAGE} total={results.total} basePath="/arama" itemName="oyun" queryParams={{ q }} /> : null}
    </div>
  );
}

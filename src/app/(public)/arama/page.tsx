import { GameSection } from "@/components/game/game-section";
import { AdSlot } from "@/components/ads/ad-slot";
import { searchPublishedGames } from "@/lib/db-games";
import { getPublicSettings } from "@/lib/db-settings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getPublicSettings();
  return { title: "Oyun Ara", alternates: { canonical: "/arama" }, robots: seo.searchIndexable ? { index: true, follow: true } : { index: false, follow: true, googleBot: { index: false, follow: true } } };
}

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const results = await searchPublishedGames(q);

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-black">Oyun Ara</h1>
        <p className="mt-2 text-sm text-muted-foreground">{q ? `"${q}" için ${results.length} sonuç bulundu.` : "Aramak istediğin oyunu yaz."}</p>
      </section>
      <AdSlot slotKey="search_results_top" />
      <GameSection title="Arama Sonuçları" games={results} />
    </div>
  );
}

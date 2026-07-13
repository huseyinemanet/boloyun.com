import { GameGrid } from "@public/components/game-grid";
import { PublicAdSlot } from "@public/components/public-ad-slot";
import { getHomeData } from "@public/lib/data";

export default async function HomePage() {
  const { allGames, sections } = await getHomeData();

  return (
    <div className="space-y-6">
      <PublicAdSlot slotKey="homepage_top_banner" />
      {sections.length > 0 ? (
        sections.map((section) => <GameGrid key={section.id} title={section.title} games={section.games} />)
      ) : (
        <GameGrid title="Yeni Oyunlar" games={allGames.items} />
      )}
    </div>
  );
}

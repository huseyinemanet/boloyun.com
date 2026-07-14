import type { Game } from "@/types/game";
import { GameCard } from "./game-card";

export function GameSection({ title, games, eagerCount = 0 }: { title: string; games: Game[]; eagerCount?: number }) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 [contain-intrinsic-size:1px_520px] [content-visibility:auto]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {games.map((game, index) => (
          <GameCard key={game.id} game={game} eager={index < eagerCount} />
        ))}
      </div>
    </section>
  );
}

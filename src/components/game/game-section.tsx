import type { Game } from "@/types/game";
import { GameCard } from "./game-card";

export function GameSection({ title, games }: { title: string; games: Game[] }) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

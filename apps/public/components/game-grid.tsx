import type { Game } from "@/types/game";
import { PublicGameCard } from "./game-card";

export function GameGrid({ title, games }: { title: string; games: Game[] }) {
  if (games.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {games.map((game) => <PublicGameCard key={game.id} game={game} />)}
      </div>
    </section>
  );
}

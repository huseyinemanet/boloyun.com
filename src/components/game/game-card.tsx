import Image from "next/image";
import type { Game } from "@/types/game";
import { IntentPrefetchLink } from "@/components/navigation/intent-prefetch-link";

export function GameCard({ game, eager = false }: { game: Game; eager?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-md border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <IntentPrefetchLink href={`/oyun/${game.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={game.thumbnailUrl}
            alt=""
            fill
            unoptimized
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            sizes="(max-width: 768px) 50vw, 220px"
            className="object-cover transition group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 p-3">
          <h3 className="truncate text-sm font-semibold" title={game.title}>{game.title}</h3>
        </div>
      </IntentPrefetchLink>
    </article>
  );
}

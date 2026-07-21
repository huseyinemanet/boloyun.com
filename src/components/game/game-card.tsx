import Image from "next/image";
import { IntentPrefetchLink } from "@/components/navigation/intent-prefetch-link";

type GameCardItem = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
};

export function GameCard({ game, eager = false, loadImage = true }: { game: GameCardItem; eager?: boolean; loadImage?: boolean }) {
  return (
    <article className="group min-w-0">
      <IntentPrefetchLink
        href={`/oyun/${game.slug}`}
        className="block"
        aria-label={`${game.title} oyununu aç`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
          {loadImage ? (
            <Image
              src={game.thumbnailUrl}
              alt={`${game.title} oyun kapağı`}
              fill
              draggable={false}
              unoptimized={game.thumbnailUrl.split("?", 1)[0].endsWith(".svg")}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              sizes="(max-width: 639px) calc(50vw - 18px), (max-width: 1023px) calc(33vw - 24px), (max-width: 1279px) calc(25vw - 72px), 220px"
              className="game-cover-image object-cover transition group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="min-w-0 pt-2">
          <h3 className="truncate text-sm font-semibold" title={game.title}>{game.title}</h3>
        </div>
      </IntentPrefetchLink>
    </article>
  );
}

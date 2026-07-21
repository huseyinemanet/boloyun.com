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
    <article
      className="group min-w-0"
      itemScope
      itemType="https://schema.org/VideoGame"
    >
      <meta itemProp="gamePlatform" content="Web Browser" />
      <meta itemProp="inLanguage" content="tr-TR" />
      <IntentPrefetchLink
        href={`/oyun/${game.slug}`}
        className="block"
        itemProp="url"
        aria-label={`${game.title} oyununu aç`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
          {loadImage ? (
            <Image
              src={game.thumbnailUrl}
              alt={`${game.title} oyun kapağı`}
              fill
              draggable={false}
              itemProp="image"
              unoptimized={game.thumbnailUrl.split("?", 1)[0].endsWith(".svg")}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              sizes="(max-width: 768px) 50vw, 220px"
              className="game-cover-image object-cover transition group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="min-w-0 pt-2">
          <h3 className="truncate text-sm font-semibold" title={game.title} itemProp="name">{game.title}</h3>
        </div>
      </IntentPrefetchLink>
    </article>
  );
}

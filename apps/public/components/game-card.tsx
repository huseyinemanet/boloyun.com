import Image from "next/image";
import Link from "next/link";
import type { Game } from "@/types/game";

export function PublicGameCard({ game }: { game: Game }) {
  return (
    <article className="group overflow-hidden rounded-md border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/oyun/${game.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={game.thumbnailUrl}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, 220px"
            className="object-cover transition group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 p-3">
          <h3 className="truncate text-sm font-black" title={game.title}>{game.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{game.shortDescription}</p>
        </div>
      </Link>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameGrid } from "@public/components/game-grid";
import { GameInteractions } from "@public/components/game-interactions";
import { JsonLd } from "@public/components/json-ld";
import { PublicAdSlot } from "@public/components/public-ad-slot";
import { StaticGamePlayer } from "@public/components/game-player";
import { getAllPublishedGameSlugs, getGameDetail, getPublishedGames, getSettings } from "@public/lib/data";
import { absoluteUrl, metadata } from "@public/lib/seo";

export const dynamicParams = false;
export const dynamic = "force-static";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return (await getAllPublishedGameSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const detail = await getGameDetail(slug);
  if (!detail) return {};
  return metadata({
    title: detail.game.seoTitle || `${detail.game.title} Oyna`,
    description: detail.game.seoDescription || detail.game.shortDescription,
    path: `/oyun/${detail.game.slug}`,
    image: detail.game.ogImageUrl || detail.game.thumbnailUrl,
    indexable: detail.game.isIndexable && !detail.game.isBroken,
  });
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const [detail, settings, latestGames] = await Promise.all([getGameDetail(slug), getSettings(), getPublishedGames(12)]);
  if (!detail) notFound();

  const { game, categories, tags, comments } = detail;
  const related = latestGames.filter((item) => item.id !== game.id).slice(0, 5);

  return (
    <article className="space-y-4">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: game.title,
        description: game.longDescription || game.shortDescription,
        image: absoluteUrl(game.thumbnailUrl),
        url: absoluteUrl(`/oyun/${game.slug}`),
        genre: [...categories.map((category) => category.name), ...tags.map((tag) => tag.name)].slice(0, 8),
      }} />
      <PublicAdSlot slotKey="game_page_top" />
      <section className="rounded-md border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
            <Image src={game.thumbnailUrl} alt={`${game.title} oyunu kapak görseli`} fill priority unoptimized className="object-cover" sizes="220px" />
          </div>
          <div>
            <h1 className="text-2xl font-black">{game.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{game.shortDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
              {categories.map((category) => <Link key={category.id} href={`/kategori/${category.slug}`} className="rounded-full bg-accent px-3 py-1">{category.name}</Link>)}
              {tags.slice(0, 6).map((tag) => <Link key={tag.id} href={`/etiket/${tag.slug}`} className="rounded-full border border-border px-3 py-1">{tag.name}</Link>)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <StaticGamePlayer game={game} allowFullscreen={settings.games.allowFullscreen} aspectRatio={settings.games.playerAspectRatio} />
        </div>
      </section>
      <PublicAdSlot slotKey="game_page_below_player" />
      <GameInteractions gameId={game.id} initialLikes={game.likesCount} initialDislikes={game.dislikesCount} />
      <section className="grid gap-3 rounded-md border border-border bg-card p-4 md:grid-cols-2">
        <InfoBlock title="Nasıl Oynanır?" body={game.howToPlay} />
        <ListBlock title="Kontroller" items={game.controls} />
        <ListBlock title="Özellikler" items={game.features} />
        <InfoBlock title="Oyun Açıklaması" body={game.longDescription} />
      </section>
      {comments.length > 0 ? (
        <section className="space-y-3 rounded-md border border-border bg-card p-4">
          <h2 className="text-lg font-black">Son Yorumlar</h2>
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-black">{comment.displayName}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{comment.body}</p>
            </article>
          ))}
        </section>
      ) : null}
      <GameGrid title="Benzer Oyunlar" games={related} />
    </article>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-lg font-black">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

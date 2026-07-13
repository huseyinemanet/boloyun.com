import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { IconThumbsDownFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconThumbsDownFillDuo18";
import { IconThumbsUpFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconThumbsUpFillDuo18";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { GameActionSubmitButton } from "@/components/game/game-action-submit-button";
import { GameCard } from "@/components/game/game-card";
import { PlayCountMetric } from "@/components/game/play-count-metric";
import { GamePlayer } from "@/components/player/game-player";
import { ShareGameButton } from "@/components/game/share-game-button";
import { JsonLd } from "@/components/seo/json-ld";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getApprovedCommentsForGame, getTopCommentsForGame, type GameComment } from "@/lib/db-comments";
import { getGameVoteForSession, type GameVote } from "@/lib/db-game-reactions";
import { getPublishedGameDetailBySlug, getPublishedGamesByCategorySlug, getRelatedPublishedGames, type GameTaxonomyLink } from "@/lib/db-games";
import { breadcrumbJsonLd, videoGameJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getProfileFavorite, getSessionFavorite } from "@/lib/db-session-favorites";
import { getCurrentProfile } from "@/lib/auth";
import { getPublicSettings } from "@/lib/db-settings";
import { isGameSourceAllowed } from "@/lib/settings/game-security";
import { renderSeoTemplate } from "@/lib/settings/validation";
import { getPublishedGames } from "@/lib/db-games";
import { createCommentAction, recordGamePlayAction, toggleFavoriteAction, voteGameAction } from "./actions";
import { CommentsTabs } from "./comments-tabs";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ comment?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getPublishedGameDetailBySlug(slug), getPublicSettings()]);

  if (!detail) {
    return {};
  }

  const { game, categories } = detail;
  const primaryCategory = categories[0];
  return buildMetadata({
    title: game.seoTitle || renderSeoTemplate(settings.seo.gameTitleTemplate, { oyun_adı: game.title, site_adı: settings.general.siteName, kategori_adı: primaryCategory?.name }),
    description: game.seoDescription || `${game.title} oyununu ücretsiz oyna. ${game.shortDescription} Tarayıcıdan hemen başlat, indirme yapmadan oynamaya başla.`,
    canonicalPath: `/oyun/${game.slug}`,
    image: game.ogImageUrl || game.thumbnailUrl,
    indexable: game.isIndexable && !game.isBroken,
    siteName: settings.general.siteName,
    baseUrl: settings.seo.canonicalDomain,
    defaultImage: settings.seo.openGraphImageUrl,
  });
}

export default async function GameDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const commentStatus = normalizeCommentStatus((await searchParams)?.comment);
  const [detail, settings] = await Promise.all([getPublishedGameDetailBySlug(slug), getPublicSettings()]);

  if (!detail) {
    notFound();
  }

  const { game, categories, tags } = detail;
  const primaryCategory = categories[0];
  const playEventName = `game-played-${game.id}`;
  const gameSessionId = (await cookies()).get("mini_game_session")?.value;
  const currentProfile = await getCurrentProfile();
  const [latestComments, topComments, userVote, isFavorite, taxonomySimilarGames, categoryGames, recentGames] = await Promise.all([
    optionalGameQuery(slug, "latest-comments", getApprovedCommentsForGame(game.id), [] as GameComment[]),
    optionalGameQuery(slug, "top-comments", getTopCommentsForGame(game.id), [] as GameComment[]),
    optionalGameQuery(slug, "session-vote", gameSessionId ? getGameVoteForSession(game.id, gameSessionId) : Promise.resolve(null), null as GameVote | null),
    optionalGameQuery(slug, "favorite-state", currentProfile?.id ? getProfileFavorite(game.id, currentProfile.id) : gameSessionId ? getSessionFavorite(game.id, gameSessionId) : Promise.resolve(false), false),
    optionalGameQuery(slug, "related-games", getRelatedPublishedGames(game.id, 4), []),
    optionalGameQuery(slug, "category-games", primaryCategory ? getPublishedGamesByCategorySlug(primaryCategory.slug, 16) : Promise.resolve([]), []),
    optionalGameQuery(slug, "recent-games", getPublishedGames(30), []),
  ]);
  const similarGames = settings.games.similarGameStrategy === "popular"
    ? recentGames.filter((item) => item.id !== game.id).toSorted((a, b) => b.playCount - a.playCount).slice(0, 4)
    : settings.games.similarGameStrategy === "category"
      ? categoryGames.filter((item) => item.id !== game.id).slice(0, 4)
      : taxonomySimilarGames;
  const source = game.gameType === "iframe" ? game.embedUrl : game.gameType === "html5" ? game.html5Url : game.gameType === "swf" ? game.swfUrl : game.externalUrl;
  const latestCategoryGames = categoryGames.filter((item) => item.id !== game.id).slice(0, 4);
  const popularCategoryGames = categoryGames
    .filter((item) => item.id !== game.id)
    .toSorted((left, right) => right.playCount - left.playCount)
    .slice(0, 4);
  const breadcrumbEntries = [
    { name: "Ana Sayfa", path: "/" },
    ...(primaryCategory ? [{ name: primaryCategory.name, path: `/kategori/${primaryCategory.slug}` }] : []),
    { name: game.title, path: `/oyun/${game.slug}` },
  ];

  return (
    <article className="space-y-4">
      <JsonLd data={[
        breadcrumbJsonLd(breadcrumbEntries),
        videoGameJsonLd({
          name: game.title,
          description: game.longDescription || game.shortDescription,
          image: game.thumbnailUrl,
          path: `/oyun/${game.slug}`,
          genres: [...categories.map((category) => category.name), ...tags.map((tag) => tag.name)].slice(0, 8),
          developer: game.developer,
          ratingAvg: game.ratingAvg,
          ratingCount: game.ratingCount,
        }),
      ]} />
      <AdSlot slotKey="game_page_top" />

      <section className="rounded-md border border-border bg-card p-4">
        <Breadcrumbs gameTitle={game.title} categories={categories} />

        {game.isBroken ? <p role="status" className="mt-4 rounded-md bg-warning/10 p-3 text-sm font-semibold text-warning">Bu oyunda geçici bir teknik sorun var. Ekip düzeltme üzerinde çalışıyor.</p> : null}

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
            <Image
              src={game.thumbnailUrl}
              unoptimized
              alt={`${game.title} oyunu kapak görseli`}
              fill
              priority
              loading="eager"
              sizes="220px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black">{game.title}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{game.shortDescription}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-3">
              {settings.games.showPlayCount ? <PlayCountMetric initialPlayCount={game.playCount} eventName={playEventName} /> : null}
              <Metric label="Puan" value={`${game.ratingAvg.toFixed(1)} / 5`} />
              <Metric label="Oy" value={`${game.ratingCount.toLocaleString("tr-TR")} değerlendirme`} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {settings.games.likesEnabled && settings.community.ratingsEnabled ? <VoteButtons gameId={game.id} slug={game.slug} likesCount={game.likesCount} dislikesCount={game.dislikesCount} userVote={userVote} /> : null}
              {settings.games.favoritesEnabled && settings.community.favoritesEnabled ? <FavoriteButton gameId={game.id} slug={game.slug} isFavorite={isFavorite} /> : null}
              {settings.games.sharingEnabled ? <ShareGameButton title={game.title} /> : null}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <GamePlayer
            game={game}
            onStartAction={recordGamePlayAction.bind(null, game.id, game.slug)}
            playEventName={playEventName}
            isLoggedIn={Boolean(currentProfile)}
            allowGuestPlay={settings.games.allowGuestPlay}
            allowFullscreen={settings.games.allowFullscreen}
            aspectRatio={settings.games.playerAspectRatio}
            loadTimeoutSeconds={settings.games.loadTimeoutSeconds}
            sourceAllowed={isGameSourceAllowed(source, settings.security)}
            preRoll={settings.ads.preRollEnabled ? <AdSlot slotKey="game_preroll" /> : undefined}
            preRollSkipSeconds={settings.ads.preRollSkipSeconds}
          />
        </div>
      </section>

      <AdSlot slotKey="game_page_below_player" />

      <section className="grid gap-3 rounded-md border border-border bg-card p-4 md:grid-cols-2">
        <InfoBlock title={`${game.title} nasıl oynanır?`} body={game.howToPlay} />
        <ListBlock title="Kontroller" items={game.controls} />
        <ListBlock title="Özellikler" items={game.features} />
      </section>

      <TaxonomyChips categories={categories} tags={tags} />

      {primaryCategory && latestCategoryGames.length ? (
        <GameGrid title={categorySectionTitle("Son", primaryCategory.name)} games={latestCategoryGames} />
      ) : null}

      {primaryCategory && popularCategoryGames.length ? (
        <GameGrid title={categorySectionTitle("En Çok Oynanan", primaryCategory.name)} games={popularCategoryGames} />
      ) : null}

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-black">Benzer Oyunlar</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {similarGames.map((similar) => (
            <GameCard key={similar.id} game={similar} />
          ))}
        </div>
      </section>

      {settings.community.commentsEnabled ? <AdSlot slotKey="game_page_before_comments" /> : null}

      {settings.community.commentsEnabled ? <CommentsSection
        gameId={game.id}
        slug={game.slug}
        latestComments={latestComments}
        topComments={topComments}
        commentStatus={commentStatus}
        isLoggedIn={Boolean(currentProfile)}
      /> : null}
    </article>
  );
}

function GameGrid({ title, games }: { title: string; games: Awaited<ReturnType<typeof getPublishedGamesByCategorySlug>> }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {games.map((game) => <GameCard key={game.id} game={game} />)}
      </div>
    </section>
  );
}

function categorySectionTitle(prefix: string, categoryName: string) {
  const normalized = categoryName.trim();
  return normalized.toLocaleLowerCase("tr").endsWith("oyunları")
    ? `${prefix} ${normalized}`
    : `${prefix} ${normalized} Oyunları`;
}

function FavoriteButton({ gameId, slug, isFavorite }: { gameId: string; slug: string; isFavorite: boolean }) {
  const canFavorite = isUuid(gameId);

  if (!canFavorite) {
    return (
      <Button
        type="button"
        disabled
        variant="outline"
        size="icon"
        className="cursor-not-allowed text-muted-foreground opacity-60"
        aria-label="Favorilere ekle"
        title="Favorilere ekle"
      >
        <IconHeartFillDuo18 className="size-[18px]" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <form action={toggleFavoriteAction}>
      <input type="hidden" name="game_id" value={gameId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="desired" value={isFavorite ? "false" : "true"} />
      <GameActionSubmitButton
        iconOnly
        className={isFavorite ? "border-destructive/40 bg-destructive/10 text-destructive ring-1 ring-destructive/20" : ""}
        active={isFavorite}
        ariaLabel={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
        title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      >
        <IconHeartFillDuo18 className={`size-[18px] ${isFavorite ? "" : "opacity-60"}`} aria-hidden="true" />
      </GameActionSubmitButton>
    </form>
  );
}

function Breadcrumbs({ gameTitle, categories }: { gameTitle: string; categories: GameTaxonomyLink[] }) {
  const primaryCategory = categories[0];

  return (
    <Breadcrumb>
      <BreadcrumbList className="font-medium">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Oyunlar</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      {primaryCategory ? (
        <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/kategori/${primaryCategory.slug}`}>{primaryCategory.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
        </>
      ) : null}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{gameTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function VoteButtons({
  gameId,
  slug,
  likesCount,
  dislikesCount,
  userVote,
}: {
  gameId: string;
  slug: string;
  likesCount: number;
  dislikesCount: number;
  userVote: GameVote | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <form action={voteGameAction}>
        <input type="hidden" name="game_id" value={gameId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="vote" value="like" />
        <GameActionSubmitButton active={userVote === "like"} ariaLabel="Beğendim" className={voteButtonClass(userVote === "like")} count={likesCount.toLocaleString("tr-TR")} title="Beğendim">
          <IconThumbsUpFillDuo18 className="size-[18px]" aria-hidden="true" />
        </GameActionSubmitButton>
      </form>
      <form action={voteGameAction}>
        <input type="hidden" name="game_id" value={gameId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="vote" value="dislike" />
        <GameActionSubmitButton active={userVote === "dislike"} ariaLabel="Beğenmedim" className={voteButtonClass(userVote === "dislike")} count={dislikesCount.toLocaleString("tr-TR")} title="Beğenmedim">
          <IconThumbsDownFillDuo18 className="size-[18px]" aria-hidden="true" />
        </GameActionSubmitButton>
      </form>
    </div>
  );
}

function voteButtonClass(isActive: boolean) {
  return `h-9 gap-1.5 px-2.5 ${isActive ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : ""}`;
}

function TaxonomyChips({ categories, tags }: { categories: GameTaxonomyLink[]; tags: GameTaxonomyLink[] }) {
  const items = [
    ...categories.map((category) => ({ ...category, href: `/kategori/${category.slug}` })),
    ...tags.slice(0, 8).map((tag) => ({ ...tag, href: `/etiket/${tag.slug}` })),
  ];

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="rounded-md bg-muted px-2 py-1 text-foreground hover:bg-accent">
          {item.name}
        </Link>
      ))}
    </div>
  );
}

function CommentsSection({
  gameId,
  slug,
  latestComments,
  topComments,
  commentStatus,
  isLoggedIn,
}: {
  gameId: string;
  slug: string;
  latestComments: GameComment[];
  topComments: GameComment[];
  commentStatus: "pending" | "approved" | "disabled" | null;
  isLoggedIn: boolean;
}) {
  const canWriteComment = isUuid(gameId);
  const commentCount = latestComments.length;

  return (
    <section id="yorumlar" className="scroll-mt-24 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Yorumlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Yorumlar onaydan sonra yayınlanır.</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold text-foreground">
          {commentCount.toLocaleString("tr-TR")} yorum
        </span>
      </div>

      {commentStatus ? <CommentNotice status={commentStatus} /> : null}

      {canWriteComment && isLoggedIn ? (
        <form action={createCommentAction} className="mt-4 space-y-3">
          <input type="hidden" name="game_id" value={gameId} />
          <input type="hidden" name="slug" value={slug} />
          <Textarea
            name="body"
            required
            minLength={3}
            maxLength={1000}
            rows={4}
            placeholder="Bu oyun hakkındaki yorumunu yaz..."
            className="resize-y p-3 font-normal leading-6 placeholder:text-muted-foreground"
          />
          <Button type="submit">Yorum Gönder</Button>
        </form>
      ) : !isLoggedIn ? (
        <p className="mt-4 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">
          Yorum yazmak için <Link href="/giris" className="text-primary hover:underline">giriş yap</Link> veya <Link href="/kayit" className="text-primary hover:underline">kayıt ol</Link>.
        </p>
      ) : (
        <p className="mt-4 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">
          Bu demo oyun için yorum kaydı kapalı. Yayındaki oyunlarda yorumlar moderasyon kuyruğuna düşer.
        </p>
      )}

      <CommentsTabs topComments={topComments} latestComments={latestComments} />
    </section>
  );
}

function CommentNotice({ status }: { status: "pending" | "approved" | "disabled" }) {
  const messages = {
    pending: "Yorumun alındı. Admin onayından sonra bu sayfada görünecek.",
    approved: "Yorumun yayınlandı.",
    disabled: "Bu demo oyun için yorum kaydı yapılamıyor.",
  };

  return (
    <p className="mt-4 rounded-md bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
      {messages[status]}
    </p>
  );
}

function normalizeCommentStatus(value: string | undefined) {
  if (value === "pending" || value === "approved" || value === "disabled") return value;
  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function optionalGameQuery<T>(slug: string, label: string, promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error("[game-detail] optional query failed", { slug, label, ...toLogError(error) });
    return fallback;
  }
}

function toLogError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-black">{title}</h2>
      <p className="text-sm leading-6 text-foreground">{body}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-black">{title}</h2>
      <ul className="space-y-1 text-sm text-foreground">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

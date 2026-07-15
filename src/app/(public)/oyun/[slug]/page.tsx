import type { Metadata } from "next";
import Image from "next/image";
import { SoundLink } from "@/components/audio/sound-link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { PlayCountMetric } from "@/components/game/play-count-metric";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getPrebuildGameSlugs, getPublicGamePageBySlug, type GameTaxonomyLink } from "@/lib/db-games";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSettings } from "@/lib/db-settings";
import { isGameSourceAllowed } from "@/lib/settings/game-security";
import { renderSeoTemplate } from "@/lib/settings/validation";
import { LazyGameActions } from "./lazy-game-actions";
import { LazyComments } from "./lazy-comments";
import { LazyGamePlayer } from "./lazy-game-player";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getPrebuildGameSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getPublicGamePageBySlug(slug), getPublicSettings()]);

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

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getPublicGamePageBySlug(slug), getPublicSettings()]);

  if (!detail) {
    notFound();
  }

  const { game, categories, tags } = detail;
  const playEventName = `game-played-${game.id}`;
  const similarGames = settings.games.similarGameStrategy === "popular"
    ? detail.popularCategoryGames
    : settings.games.similarGameStrategy === "category"
      ? detail.latestCategoryGames
      : detail.relatedGames;
  const source = game.gameType === "iframe" ? game.embedUrl : game.gameType === "html5" ? game.html5Url : game.gameType === "swf" ? game.swfUrl : game.externalUrl;
  return (
    <article className="space-y-4">
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
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="min-w-0 flex-1 text-2xl font-semibold">{game.title}</h1>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <LazyGameActions
                      gameId={game.id}
                      slug={game.slug}
                      likesCount={game.likesCount}
                      dislikesCount={game.dislikesCount}
                      showVotes={settings.games.likesEnabled && settings.community.ratingsEnabled}
                      showFavorite={settings.games.favoritesEnabled && settings.community.favoritesEnabled}
                      showShare={settings.games.sharingEnabled}
                      title={game.title}
                    />
                  </div>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{compactText(game.shortDescription, 320)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-3">
              {settings.games.showPlayCount ? <PlayCountMetric initialPlayCount={game.playCount} eventName={playEventName} /> : null}
              <Metric label="Puan" value={`${game.ratingAvg.toFixed(1)} / 5`} />
              <Metric label="Oy" value={`${game.ratingCount.toLocaleString("tr-TR")} değerlendirme`} />
            </div>

          </div>
        </div>

        <div className="mt-4">
          <LazyGamePlayer
            game={{
              id: game.id,
              title: game.title,
              slug: game.slug,
              gameType: game.gameType,
              embedUrl: game.embedUrl,
              swfUrl: game.swfUrl,
              html5Url: game.html5Url,
              externalUrl: game.externalUrl,
            }}
            playEventName={playEventName}
            isLoggedIn={false}
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
        <InfoBlock title={`${game.title} nasıl oynanır?`} body={compactText(game.howToPlay, 480)} />
        <ListBlock title="Kontroller" items={game.controls.slice(0, 6).map((item) => compactText(item, 180))} />
        <ListBlock title="Özellikler" items={game.features.slice(0, 6).map((item) => compactText(item, 180))} />
      </section>

      <TaxonomyChips categories={categories} tags={tags} />

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Benzer Oyunlar</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {similarGames.slice(0, 6).map((similar) => (
            <SoundLink
              key={similar.id}
              href={`/oyun/${similar.slug}`}
              className="truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-semibold hover:bg-accent"
              title={similar.title}
            >
              {similar.title}
            </SoundLink>
          ))}
        </div>
      </section>

      {settings.community.commentsEnabled ? <AdSlot slotKey="game_page_before_comments" /> : null}

      {settings.community.commentsEnabled ? <LazyComments gameId={game.id} slug={game.slug} /> : null}
    </article>
  );
}

function Breadcrumbs({ gameTitle, categories }: { gameTitle: string; categories: GameTaxonomyLink[] }) {
  const primaryCategory = categories[0];

  return (
    <Breadcrumb>
      <BreadcrumbList className="font-medium">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <SoundLink href="/" native>Oyunlar</SoundLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
      {primaryCategory ? (
        <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <SoundLink href={`/kategori/${primaryCategory.slug}`} native>{primaryCategory.name}</SoundLink>
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

function TaxonomyChips({ categories, tags }: { categories: GameTaxonomyLink[]; tags: GameTaxonomyLink[] }) {
  const items = [
    ...categories.slice(0, 4).map((category) => ({ ...category, href: `/kategori/${category.slug}` })),
    ...tags.slice(0, 8).map((tag) => ({ ...tag, href: `/etiket/${tag.slug}` })),
  ];

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold">
      {items.map((item) => (
        <SoundLink key={item.href} href={item.href} native className="rounded-md bg-muted px-2 py-1 text-foreground hover:bg-accent">
          {item.name}
        </SoundLink>
      ))}
    </div>
  );
}


function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-foreground">{body}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <ul className="space-y-1 text-sm text-foreground">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function compactText(value: string, limit: number) {
  const normalized = value.trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}…`;
}

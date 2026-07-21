import { normalizeSiteAssetUrl } from "@/lib/site-assets";
import type { Game, GameSearchSuggestion, GameType, PublishStatus } from "@/types/game";

export type GameRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  how_to_play: string | null;
  controls: string[] | null;
  features: string[] | null;
  developer: string | null;
  thumbnail_url: string | null;
  thumbnail_source_url?: string | null;
  thumbnail_r2_key?: string | null;
  thumbnail_sync_status?: "pending" | "syncing" | "synced" | "failed" | "rolled_back" | null;
  thumbnail_sync_error?: string | null;
  thumbnail_synced_at?: string | null;
  game_type: GameType;
  embed_url: string | null;
  swf_url: string | null;
  html5_url: string | null;
  external_url: string | null;
  source_url: string | null;
  source_domain: string | null;
  status: PublishStatus;
  rating_avg: number | null;
  rating_count: number | null;
  likes_count: number | null;
  dislikes_count: number | null;
  play_count: number | null;
  favorite_count?: number | null;
  popularity_score?: number | null;
  seo_title: string | null;
  seo_description: string | null;
  primary_category_id?: string | null;
  og_image_url?: string | null;
  is_indexable?: boolean | null;
  is_broken?: boolean | null;
};

export type GameTaxonomyLink = {
  id?: string;
  name: string;
  slug: string;
};

export type GameDetail = {
  game: Game;
  categories: GameTaxonomyLink[];
  tags: GameTaxonomyLink[];
};

export type PublicGamePageSnapshot = GameDetail & {
  relatedGames: Game[];
  latestCategoryGames: Game[];
  popularCategoryGames: Game[];
};

export type AdminPopularGame = {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  thumbnailUrl: string;
  playCount: number;
  favoriteCount: number;
  likesCount: number;
  dislikesCount: number;
  ratingAvg: number;
  ratingCount: number;
  popularityScore: number;
};

export type AdminPopularGameRow = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  play_count: number | null;
  likes_count: number | null;
  dislikes_count: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  favorite_count?: number | null;
  popularity_score?: number | null;
};

export function mapGameRow(row: GameRow): Game {
  const shortDescription = row.short_description ?? "";
  const longDescription = row.long_description ?? shortDescription;
  const controls = Array.isArray(row.controls) ? row.controls : [];
  const howToPlay = normalizeHowToPlay({
    title: row.title,
    howToPlay: row.how_to_play ?? "",
    shortDescription,
    longDescription,
    controls,
  });

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription,
    longDescription,
    howToPlay,
    controls,
    features: Array.isArray(row.features) ? row.features : [],
    developer: row.developer ?? "",
    thumbnailUrl: normalizeGameThumbnail(row.thumbnail_url),
    thumbnailSourceUrl: row.thumbnail_source_url ?? null,
    thumbnailR2Key: row.thumbnail_r2_key ?? null,
    thumbnailSyncStatus: row.thumbnail_sync_status ?? undefined,
    thumbnailSyncError: row.thumbnail_sync_error ?? null,
    thumbnailSyncedAt: row.thumbnail_synced_at ?? null,
    gameType: row.game_type,
    embedUrl: row.embed_url ?? undefined,
    swfUrl: row.swf_url ?? undefined,
    html5Url: row.html5_url ?? undefined,
    externalUrl: row.external_url ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    sourceDomain: row.source_domain ?? undefined,
    status: row.status,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: row.rating_count ?? 0,
    likesCount: row.likes_count ?? 0,
    dislikesCount: row.dislikes_count ?? 0,
    playCount: row.play_count ?? 0,
    categories: [],
    tags: [],
    seoTitle: row.seo_title ?? `${row.title} Oyna`,
    seoDescription: row.seo_description ?? row.short_description ?? "",
    primaryCategoryId: row.primary_category_id ?? undefined,
    ogImageUrl: row.og_image_url ?? undefined,
    isIndexable: row.is_indexable ?? row.status === "published",
    isBroken: row.is_broken ?? false,
  };
}

export function prioritizeTaxonomy(items: GameTaxonomyLink[], primaryCategoryId?: string) {
  if (!primaryCategoryId) return items;
  return [...items].sort((left, right) => {
    const leftPrimary = left.id === primaryCategoryId ? 1 : 0;
    const rightPrimary = right.id === primaryCategoryId ? 1 : 0;
    return rightPrimary - leftPrimary;
  });
}

export function mapGameSearchSuggestion(game: Game): GameSearchSuggestion {
  return {
    id: game.id,
    title: game.title,
    slug: game.slug,
    thumbnailUrl: game.thumbnailUrl,
    shortDescription: game.shortDescription,
  };
}

export function normalizeGameThumbnail(value: string | null | undefined, fallback = "/thumbnails/space.svg") {
  return normalizeSiteAssetUrl(value) ?? fallback;
}

export function mapAdminPopularGame(row: AdminPopularGameRow, favoriteCount = row.favorite_count ?? 0): AdminPopularGame {
  const playCount = row.play_count ?? 0;
  const likesCount = row.likes_count ?? 0;
  const dislikesCount = row.dislikes_count ?? 0;
  const ratingAvg = Number(row.rating_avg ?? 0);
  const ratingCount = row.rating_count ?? 0;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    categoryName: "",
    thumbnailUrl: normalizeGameThumbnail(row.thumbnail_url),
    playCount,
    favoriteCount,
    likesCount,
    dislikesCount,
    ratingAvg,
    ratingCount,
    popularityScore: Number(row.popularity_score ?? calculatePopularityScore({
      playCount,
      favoriteCount,
      likesCount,
      dislikesCount,
      ratingAvg,
      ratingCount,
    })),
  };
}

export function countFavoritesByGameId(rows: unknown) {
  const counts = new Map<string, number>();
  if (!Array.isArray(rows)) return counts;

  for (const row of rows as Array<{ game_id: string | null }>) {
    if (!row.game_id) continue;
    counts.set(row.game_id, (counts.get(row.game_id) ?? 0) + 1);
  }

  return counts;
}

export function calculatePopularityScore({
  playCount,
  favoriteCount,
  likesCount,
  dislikesCount,
  ratingAvg,
  ratingCount,
}: {
  playCount: number;
  favoriteCount: number;
  likesCount: number;
  dislikesCount: number;
  ratingAvg: number;
  ratingCount: number;
}) {
  const confidence = ratingCount / (ratingCount + 5);
  return (
    Math.log1p(Math.max(0, playCount)) * 20
    + Math.log1p(Math.max(0, favoriteCount)) * 45
    + Math.log1p(Math.max(0, ratingCount)) * 30
    + Math.log1p(Math.max(0, likesCount)) * 4
    + (ratingAvg - 3) * 12 * confidence
    - Math.log1p(Math.max(0, dislikesCount)) * 8
  );
}

export function sortPopularGames(left: AdminPopularGame, right: AdminPopularGame) {
  return right.popularityScore - left.popularityScore || right.playCount - left.playCount || left.title.localeCompare(right.title, "tr");
}

export function mapTaxonomyRows(rows: unknown, key: "categories" | "tags"): GameTaxonomyLink[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const value = (row as Record<string, unknown>)[key];
      const items = Array.isArray(value) ? value : [value];

      return items.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id : "";
        const name = typeof record.name === "string" ? record.name : "";
        const slug = typeof record.slug === "string" ? record.slug : "";
        return name && slug ? [{ id, name, slug }] : [];
      });
    })
    .filter((item, index, all) => all.findIndex((other) => other.slug === item.slug) === index);
}

export function mapTaxonomyItems(items: unknown): GameTaxonomyLink[] {
  if (!Array.isArray(items)) return [];

  return items
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const name = typeof record.name === "string" ? record.name : "";
      const slug = typeof record.slug === "string" ? record.slug : "";
      return name && slug ? [{ id, name, slug }] : [];
    })
    .filter((item, index, all) => all.findIndex((other) => other.slug === item.slug) === index);
}

export function mapIdRows(rows: unknown, key: "category_id" | "tag_id") {
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = (row as Record<string, unknown>)[key];
    return typeof value === "string" && value ? [value] : [];
  });
}

export function normalizeGameIds(ids: string[]) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))].sort();
}

export function restoreRequestedGameOrder(ids: string[], games: Game[]) {
  const byId = new Map(games.map((game) => [game.id, game]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export function scoreRelatedGameIds(items: { id: string; score: number }[]) {
  const scores = new Map<string, number>();
  for (const item of items) {
    scores.set(item.id, (scores.get(item.id) ?? 0) + item.score);
  }

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function rankRelatedGameCandidates({
  categoryLinks,
  tagLinks,
  primaryCategoryId,
}: {
  categoryLinks: Array<{ gameId: string; taxonomyId: string }>;
  tagLinks: Array<{ gameId: string; taxonomyId: string }>;
  primaryCategoryId?: string;
}) {
  const categorySizes = countTaxonomyMembers(categoryLinks);
  const tagSizes = countTaxonomyMembers(tagLinks);
  const candidates = new Map<string, { categories: Set<string>; tags: Set<string>; score: number }>();

  for (const link of categoryLinks) {
    const candidate = candidates.get(link.gameId) ?? { categories: new Set<string>(), tags: new Set<string>(), score: 0 };
    if (!candidate.categories.has(link.taxonomyId)) {
      const memberCount = categorySizes.get(link.taxonomyId) ?? 1;
      const baseWeight = link.taxonomyId === primaryCategoryId ? 90 : 45;
      candidate.score += baseWeight + Math.max(0, 35 - Math.log2(memberCount + 1) * 5);
      candidate.categories.add(link.taxonomyId);
    }
    candidates.set(link.gameId, candidate);
  }

  for (const link of tagLinks) {
    const candidate = candidates.get(link.gameId) ?? { categories: new Set<string>(), tags: new Set<string>(), score: 0 };
    if (!candidate.tags.has(link.taxonomyId)) {
      const memberCount = tagSizes.get(link.taxonomyId) ?? 1;
      candidate.score += 28 + Math.max(0, 25 - Math.log2(memberCount + 1) * 3);
      candidate.tags.add(link.taxonomyId);
    }
    candidates.set(link.gameId, candidate);
  }

  return Array.from(candidates, ([id, candidate]) => {
    const categoryOverlapBonus = Math.max(0, candidate.categories.size - 1) * 30;
    const tagOverlapBonus = Math.max(0, candidate.tags.size - 1) * 12;
    const mixedSignalBonus = candidate.categories.size > 0 && candidate.tags.size > 0 ? 20 : 0;
    return { id, score: candidate.score + categoryOverlapBonus + tagOverlapBonus + mixedSignalBonus };
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

function countTaxonomyMembers(links: Array<{ gameId: string; taxonomyId: string }>) {
  const members = new Map<string, Set<string>>();
  for (const link of links) {
    const taxonomyMembers = members.get(link.taxonomyId) ?? new Set<string>();
    taxonomyMembers.add(link.gameId);
    members.set(link.taxonomyId, taxonomyMembers);
  }
  return new Map(Array.from(members, ([taxonomyId, gameIds]) => [taxonomyId, gameIds.size]));
}

export function pickRandomItem<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeHowToPlay({
  title,
  howToPlay,
  shortDescription,
  longDescription,
  controls,
}: {
  title: string;
  howToPlay: string;
  shortDescription: string;
  longDescription: string;
  controls: string[];
}) {
  const cleanHowToPlay = howToPlay.trim();
  const duplicate =
    !cleanHowToPlay ||
    isSameText(cleanHowToPlay, shortDescription) ||
    isSameText(cleanHowToPlay, longDescription);

  if (!duplicate) return cleanHowToPlay;

  if (controls.length) {
    return `${title} oyununu başlat, karakterini ekrandaki hedeflere göre yönlendir ve görevleri tamamlamaya çalış. Kontroller: ${controls.join(", ")}.`;
  }

  return `${title} oyununu başlatmak için Oyunu Başlat butonuna bas. Oyun yüklendikten sonra ekrandaki yönlendirmeleri takip ederek hedefleri tamamlamaya çalış.`;
}

function isSameText(left: string, right: string) {
  return normalizeComparableText(left) === normalizeComparableText(right);
}

function normalizeComparableText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

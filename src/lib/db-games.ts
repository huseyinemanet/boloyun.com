import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { games as fallbackGames } from "@/lib/data";
import { allowPublicDemoData, publicDataUnavailable } from "@/lib/public-data-guard";
import type { Game, GameSearchSuggestion, GameType, PublishStatus } from "@/types/game";
import { slugify } from "@/lib/slug/slugify";
import { getPublicSettings } from "@/lib/db-settings";
import { normalizePublicCategoryRow, type CategoryRow } from "@/lib/db-categories";
import { isGameSourceAllowed } from "@/lib/settings/game-security";
import { measuredQuery } from "@/lib/query-observability";
import { keysetFilter, type KeysetCursor, type KeysetDirection } from "@/lib/keyset-pagination";
import { normalizeSiteAssetUrl } from "@/lib/site-assets";

const publicGameSelect = [
  "id",
  "title",
  "slug",
  "short_description",
  "long_description",
  "how_to_play",
  "controls",
  "features",
  "developer",
  "thumbnail_url",
  "game_type",
  "embed_url",
  "swf_url",
  "html5_url",
  "external_url",
  "source_url",
  "source_domain",
  "status",
  "rating_avg",
  "rating_count",
  "likes_count",
  "dislikes_count",
  "play_count",
  "seo_title",
  "seo_description",
].join(",");

// Collection pages only render card metadata. Fetching full descriptions,
// player URLs and SEO content for every card makes the RSC payload
// unnecessarily large and burns application CPU while mapping and serializing it.
const publicGameCardSelect = [
  "id",
  "title",
  "slug",
  "thumbnail_url",
  "game_type",
  "status",
  "rating_avg",
  "rating_count",
  "likes_count",
  "dislikes_count",
  "play_count",
].join(",");

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

type GameRelationRow = {
  game_id: string;
};

type PublicCategoryPageRpc = {
  category?: CategoryRow | null;
  games?: GameRow[];
  total?: number | string | null;
};

type PublicGameDetailRpc = {
  game?: GameRow | null;
  categories?: unknown;
  tags?: unknown;
};

type PublicGamePageRpc = PublicGameDetailRpc & {
  related_games?: GameRow[];
  latest_category_games?: GameRow[];
  popular_category_games?: GameRow[];
};

export type PublicGamePageSnapshot = GameDetail & {
  relatedGames: Game[];
  latestCategoryGames: Game[];
  popularCategoryGames: Game[];
};

type FavoriteGameRow = {
  game_id: string | null;
};

type AdminPopularGameRow = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  play_count: number | null;
  likes_count: number | null;
  dislikes_count: number | null;
  rating_avg: number | null;
  rating_count: number | null;
};

type GameSearchSuggestionRow = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  short_description: string | null;
};

type PublicGameSearchRpc = {
  items?: GameRow[];
  total?: number | string | null;
};

type AdminPopularGameCategoryRow = {
  game_id: string;
  categories: { name: string | null } | { name: string | null }[] | null;
};

export type GameUpdateInput = {
  title: string;
  slug: string;
  status: PublishStatus;
  short_description: string;
  long_description: string;
  how_to_play: string;
  controls: string[];
  features: string[];
  developer: string;
  thumbnail_url: string;
  thumbnail_source_url?: string | null;
  thumbnail_r2_key?: string | null;
  thumbnail_sync_status?: "pending" | "syncing" | "synced" | "failed" | "rolled_back";
  thumbnail_sync_error?: string | null;
  thumbnail_synced_at?: string | null;
  game_type: GameType;
  embed_url: string;
  swf_url: string;
  html5_url: string;
  external_url: string;
  seo_title: string;
  seo_description: string;
  primary_category_id: string;
  og_image_url: string;
  is_indexable: boolean;
  is_broken: boolean;
  category_ids: string[];
  tags: string[];
};

export type AdminGameTaxonomy = {
  categoryIds: string[];
  tags: string[];
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

const getPublishedGamesCached = unstable_cache(async function getPublishedGames(limit = 60): Promise<Game[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    if (!allowPublicDemoData()) {
      throw publicDataUnavailable("Yayınlanmış oyunlar", "Supabase yapılandırması eksik");
    }
    return fallbackGames;
  }

  const { data, error } = await measuredQuery("games.published.latest", supabase
    .from("games")
    .select(publicGameCardSelect)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit));

  if (error) {
    if (!allowPublicDemoData()) {
      throw publicDataUnavailable("Yayınlanmış oyunlar", error.message);
    }
    return fallbackGames;
  }

  if (!data || data.length === 0) return allowPublicDemoData() ? fallbackGames : [];

  return (data as unknown as GameRow[]).map(mapGameRow);
}, ["published-game-cards-v2"], { revalidate: 3600, tags: ["games"] });
export const getPublishedGames = cache(getPublishedGamesCached);

export async function getPrebuildGameSlugs(): Promise<Array<{ slug: string }>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return fallbackGames.slice(0, 300).map(({ slug }) => ({ slug }));

  const [popular, latest] = await Promise.all([
    supabase.from("games").select("slug").eq("status", "published").order("play_count", { ascending: false }).limit(200),
    supabase.from("games").select("slug").eq("status", "published").order("created_at", { ascending: false }).limit(100),
  ]);
  const slugs = new Set<string>();
  for (const row of [...(popular.data ?? []), ...(latest.data ?? [])]) {
    if (typeof row.slug === "string") slugs.add(row.slug);
  }
  return Array.from(slugs, (slug) => ({ slug }));
}

export async function getAdminPopularGames(limit = 8): Promise<AdminPopularGame[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return fallbackGames
      .filter((game) => game.status === "published")
      .map((game) => ({
        id: game.id,
        title: game.title,
        slug: game.slug,
        categoryName: game.categories[0] ?? "",
        thumbnailUrl: game.thumbnailUrl,
        playCount: game.playCount,
        favoriteCount: 0,
        likesCount: game.likesCount,
        dislikesCount: game.dislikesCount,
        ratingAvg: game.ratingAvg,
        ratingCount: game.ratingCount,
        popularityScore: calculatePopularityScore({
          playCount: game.playCount,
          favoriteCount: 0,
          likesCount: game.likesCount,
          dislikesCount: game.dislikesCount,
          ratingAvg: game.ratingAvg,
          ratingCount: game.ratingCount,
        }),
      }))
      .sort(sortPopularGames)
      .slice(0, limit);
  }

  const [{ data: playedGames }, { data: likedGames }, { data: favorites }] = await Promise.all([
    supabase
      .from("games")
      .select("id, title, slug, thumbnail_url, play_count, likes_count, dislikes_count, rating_avg, rating_count")
      .eq("status", "published")
      .order("play_count", { ascending: false })
      .limit(400),
    supabase
      .from("games")
      .select("id, title, slug, thumbnail_url, play_count, likes_count, dislikes_count, rating_avg, rating_count")
      .eq("status", "published")
      .order("likes_count", { ascending: false })
      .limit(400),
    supabase
      .from("favorites")
      .select("game_id"),
  ]);

  const favoriteCounts = countFavoritesByGameId(favorites);
  const favoriteCandidateIds = Array.from(favoriteCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 400)
    .map(([gameId]) => gameId);

  const favoriteGames = favoriteCandidateIds.length
    ? await getAdminPopularGameRowsByIds(favoriteCandidateIds)
    : [];

  const popularGames = [...((playedGames ?? []) as AdminPopularGameRow[]), ...((likedGames ?? []) as AdminPopularGameRow[]), ...favoriteGames]
    .reduce<AdminPopularGame[]>((items, row) => {
      if (items.some((item) => item.id === row.id)) return items;
      const game = mapAdminPopularGame(row, favoriteCounts.get(row.id) ?? 0);
      items.push(game);
      return items;
    }, [])
    .sort(sortPopularGames)
    .slice(0, limit);

  const categoryNames = await getPrimaryCategoryNamesByGameId(popularGames.map((game) => game.id));
  return popularGames.map((game) => ({ ...game, categoryName: categoryNames.get(game.id) ?? "" }));
}

export async function getRandomPublishedGameSlug(excludeSlug?: string): Promise<string | null> {
  const publishedFallbackGames = fallbackGames.filter(
    (game) => game.status === "published" && game.slug !== excludeSlug,
  );
  const fallbackSlug = pickRandomItem(publishedFallbackGames)?.slug ?? null;
  const supabase = createSupabaseServiceClient();
  if (!supabase) return fallbackSlug;

  const { data, error } = await measuredQuery("games.random.slug", supabase.rpc(
    "get_random_published_game_slug",
    { p_exclude_slug: excludeSlug ?? null },
  ));

  if (error || typeof data !== "string" || !data) return fallbackSlug;
  return data;
}

export async function getPublishedGamesPage({ page, perPage }: { page: number; perPage: number }): Promise<{ items: Game[]; total: number }> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    const published = fallbackGames.filter((game) => game.status === "published");
    const from = (page - 1) * perPage;
    return {
      items: published.slice(from, from + perPage),
      total: published.length,
    };
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await measuredQuery("games.published.page", supabase
    .from("games")
    .select(publicGameCardSelect, { count: "exact" })
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(from, to));

  if (error || !data) {
    return { items: [], total: 0 };
  }

  return {
    items: (data as unknown as GameRow[]).map(mapGameRow),
    total: count ?? 0,
  };
}

const getRelatedPublishedGamesCached = unstable_cache(async function getRelatedPublishedGames(gameId: string, limit = 4): Promise<Game[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return fallbackGames.filter((game) => game.id !== gameId).slice(0, limit);
  }

  const [{ data: categoryLinks }, { data: tagLinks }] = await Promise.all([
    measuredQuery("games.related.category-links", supabase.from("game_categories").select("category_id").eq("game_id", gameId)),
    measuredQuery("games.related.tag-links", supabase.from("game_tags").select("tag_id").eq("game_id", gameId)),
  ]);

  const categoryIds = mapIdRows(categoryLinks, "category_id");
  const tagIds = mapIdRows(tagLinks, "tag_id");

  const [relatedByCategory, relatedByTag] = await Promise.all([
    categoryIds.length
      ? measuredQuery("games.related.by-category", supabase.from("game_categories").select("game_id").in("category_id", categoryIds).neq("game_id", gameId).limit(80))
      : Promise.resolve({ data: [] as GameRelationRow[] }),
    tagIds.length
      ? measuredQuery("games.related.by-tag", supabase.from("game_tags").select("game_id").in("tag_id", tagIds).neq("game_id", gameId).limit(120))
      : Promise.resolve({ data: [] as GameRelationRow[] }),
  ]);

  const scoredIds = scoreRelatedGameIds([
    ...((relatedByCategory.data ?? []) as GameRelationRow[]).map((row) => ({ id: row.game_id, score: 2 })),
    ...((relatedByTag.data ?? []) as GameRelationRow[]).map((row) => ({ id: row.game_id, score: 1 })),
  ]).slice(0, limit * 3);

  const relatedGames = scoredIds.length
    ? await getPublishedGamesByIds(scoredIds.map((item) => item.id))
    : [];

  const byId = new Map(relatedGames.map((game) => [game.id, game]));
  const sorted = scoredIds.flatMap((item) => {
    const game = byId.get(item.id);
    return game ? [game] : [];
  });

  if (sorted.length >= limit) {
    return sorted.slice(0, limit);
  }

  const fallback = (await getPublishedGames(limit * 3)).filter(
    (game) => game.id !== gameId && !sorted.some((related) => related.id === game.id),
  );

  return [...sorted, ...fallback].slice(0, limit);
}, ["related-published-games-v1"], { revalidate: 3600, tags: ["games", "categories", "tags"] });
export const getRelatedPublishedGames = cache(getRelatedPublishedGamesCached);

const getPublishedGamesByCategorySlugCached = unstable_cache(async function getPublishedGamesByCategorySlug(slug: string, limit = 60): Promise<Game[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return fallbackGames.filter((game) => game.status === "published" && game.categories.includes(slug)).slice(0, limit);
  }

  const { data: category, error: categoryError } = await measuredQuery("categories.public.by-slug-id", supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle());

  if (categoryError || !category) return [];

  const { data: links, error: linksError } = await measuredQuery("categories.public.game-links", supabase
    .from("game_categories")
    .select("game_id")
    .eq("category_id", (category as { id: string }).id)
    .limit(limit));

  if (linksError || !links) return [];

  const gameIds = (links as GameRelationRow[]).map((link) => link.game_id);
  return getPublishedGamesByIds(gameIds);
}, ["published-games-by-category-slug-v2"], { revalidate: 3600, tags: ["games", "categories"] });
export const getPublishedGamesByCategorySlug = cache(getPublishedGamesByCategorySlugCached);

const getPublishedGamesByCategorySlugPageCached = unstable_cache(async function getPublishedGamesByCategorySlugPage(slug: string, page: number, perPage: number): Promise<{ items: Game[]; total: number; category: CategoryRow | null }> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    const games = fallbackGames.filter((game) => game.status === "published" && game.categories.includes(slug));
    const from = (page - 1) * perPage;
    return {
      items: games.slice(from, from + perPage),
      total: games.length,
      category: null,
    };
  }

  const from = (page - 1) * perPage;
  const { data: rpcData, error: rpcError } = await measuredQuery("categories.public.page-rpc", supabase.rpc("get_public_category_game_page", {
    p_slug: slug,
    p_limit: perPage,
    p_offset: from,
  }));

  if (!rpcError && rpcData && typeof rpcData === "object") {
    const result = rpcData as PublicCategoryPageRpc;
    return {
      items: Array.isArray(result.games) ? result.games.map(mapGameRow) : [],
      total: Number(result.total ?? 0),
      category: result.category ? normalizePublicCategoryRow(result.category) : null,
    };
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (categoryError || !category) return { items: [], total: 0, category: null };

  const to = from + perPage - 1;
  const { data: links, error: linksError, count } = await supabase
    .from("game_categories")
    .select("game_id, games!inner(id)", { count: "exact" })
    .eq("category_id", (category as { id: string }).id)
    .eq("games.status", "published")
    .range(from, to);

  if (linksError || !links) return { items: [], total: 0, category: null };

  const gameIds = (links as GameRelationRow[]).map((link) => link.game_id);
  return {
    items: await getPublishedGamesByIds(gameIds),
    total: count ?? 0,
    category: null,
  };
}, ["public-category-games-page-v1"], { revalidate: 3600, tags: ["games", "categories"] });

export const getPublishedGamesByCategorySlugPage = cache(async function getPublishedGamesByCategorySlugPage({
  slug,
  page,
  perPage,
}: {
  slug: string;
  page: number;
  perPage: number;
}): Promise<{ items: Game[]; total: number; category: CategoryRow | null }> {
  return getPublishedGamesByCategorySlugPageCached(slug, page, perPage);
});

export type AdminGameListItem = Pick<Game, "id" | "title" | "slug" | "shortDescription" | "thumbnailUrl" | "status" | "playCount" | "isBroken" | "thumbnailSyncStatus"> & {
  updatedAt: string;
};

export async function getAdminGamesNumberedPage({ page, perPage, search = "" }: {
  page: number;
  perPage: number;
  search?: string;
}): Promise<{ items: AdminGameListItem[]; total: number }> {
  const supabase = createSupabaseServiceClient();
  const normalizedSearch = search.trim();
  const from = (page - 1) * perPage;

  if (!supabase) {
    const loweredSearch = normalizedSearch.toLocaleLowerCase("tr");
    const filtered = fallbackGames.filter((game) => !loweredSearch || game.title.toLocaleLowerCase("tr").includes(loweredSearch));
    return {
      items: filtered.slice(from, from + perPage).map((game, index) => ({ ...game, updatedAt: new Date(from + index).toISOString() })),
      total: filtered.length,
    };
  }

  const select = "id,title,slug,short_description,thumbnail_url,status,play_count,is_broken,thumbnail_sync_status,updated_at";
  const searchPattern = normalizedSearch
    ? `%${normalizedSearch.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`
    : null;

  if (from === 0) {
    let firstPageQuery = supabase
      .from("games")
      .select(select, { count: "exact" })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(perPage);
    if (searchPattern) firstPageQuery = firstPageQuery.ilike("title", searchPattern);

    const { data, error, count } = await measuredQuery("games.admin.numbered-page.first", firstPageQuery);
    if (error || !data) return { items: [], total: 0 };
    return { items: data.map(mapAdminGameListRow), total: count ?? 0 };
  }

  let boundaryQuery = supabase
    .from("games")
    .select("id,updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from);
  if (searchPattern) boundaryQuery = boundaryQuery.ilike("title", searchPattern);

  const { data: boundaryRows, error: boundaryError, count } = await measuredQuery("games.admin.numbered-page.boundary", boundaryQuery);
  if (boundaryError || !boundaryRows?.[0]) return { items: [], total: count ?? 0 };

  const boundary = boundaryRows[0];
  let itemsQuery = supabase
    .from("games")
    .select(select)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .or(`updated_at.lt.${boundary.updated_at},and(updated_at.eq.${boundary.updated_at},id.lte.${boundary.id})`)
    .limit(perPage);
  if (searchPattern) itemsQuery = itemsQuery.ilike("title", searchPattern);

  const { data, error } = await measuredQuery("games.admin.numbered-page.items", itemsQuery);
  if (error || !data) return { items: [], total: 0 };

  return {
    items: data.map(mapAdminGameListRow),
    total: count ?? 0,
  };
}

function mapAdminGameListRow(row: {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  status: string;
  play_count: number | null;
  is_broken: boolean | null;
  thumbnail_sync_status: string | null;
  updated_at: string;
}): AdminGameListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description ?? "",
    thumbnailUrl: normalizeGameThumbnail(row.thumbnail_url, "/images/game-placeholder.svg"),
    status: row.status as PublishStatus,
    playCount: row.play_count ?? 0,
    isBroken: Boolean(row.is_broken),
    thumbnailSyncStatus: normalizeThumbnailSyncStatus(row.thumbnail_sync_status),
    updatedAt: row.updated_at,
  };
}

function normalizeThumbnailSyncStatus(value: string | null): AdminGameListItem["thumbnailSyncStatus"] {
  return value === "pending" || value === "syncing" || value === "synced" || value === "failed" || value === "rolled_back"
    ? value
    : undefined;
}

export async function getAdminGamesPage({ cursor, direction, perPage, search = "" }: {
  cursor: KeysetCursor | null;
  direction: KeysetDirection;
  perPage: number;
  search?: string;
}): Promise<{ items: AdminGameListItem[]; previousCursor: KeysetCursor | null; nextCursor: KeysetCursor | null }> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr");
    const items = fallbackGames
      .filter((game) => !normalizedSearch || game.title.toLocaleLowerCase("tr").includes(normalizedSearch))
      .slice(0, perPage)
      .map((game, index) => ({ ...game, updatedAt: new Date(index).toISOString() }));
    return {
      items,
      previousCursor: null,
      nextCursor: null,
    };
  }

  const ascending = direction === "previous";
  let query = supabase
    .from("games")
    .select("id,title,slug,short_description,thumbnail_url,status,play_count,is_broken,thumbnail_sync_status,updated_at")
    .order("updated_at", { ascending })
    .order("id", { ascending })
    .limit(perPage + 1);

  const normalizedSearch = search.trim();
  if (normalizedSearch) {
    const searchPattern = `%${normalizedSearch.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    query = query.ilike("title", searchPattern);
  }
  if (cursor) query = query.or(keysetFilter(cursor, direction));
  const { data, error } = await query;

  if (error || !data) {
    return { items: [], previousCursor: null, nextCursor: null };
  }

  const hasMore = data.length > perPage;
  const pageRows = data.slice(0, perPage);
  if (ascending) pageRows.reverse();
  const items = pageRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description ?? "",
    thumbnailUrl: normalizeGameThumbnail(row.thumbnail_url, "/images/game-placeholder.svg"),
    status: row.status as PublishStatus,
    playCount: row.play_count ?? 0,
    isBroken: Boolean(row.is_broken),
    thumbnailSyncStatus: row.thumbnail_sync_status ?? undefined,
    updatedAt: row.updated_at,
  }));

  return {
    items,
    previousCursor: items.length > 0 && (direction === "next" ? cursor !== null : hasMore)
      ? { updatedAt: items[0].updatedAt, id: items[0].id }
      : null,
    nextCursor: items.length > 0 && (direction === "previous" ? true : hasMore)
      ? { updatedAt: items[items.length - 1].updatedAt, id: items[items.length - 1].id }
      : null,
  };
}

export async function getAdminGameById(id: string): Promise<Game | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return fallbackGames.find((game) => game.id === id) ?? null;

  const { data, error } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;

  return mapGameRow(data as unknown as GameRow);
}

export async function getAdminGameTaxonomy(gameId: string): Promise<AdminGameTaxonomy> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { categoryIds: [], tags: [] };
  const [{ data: categoryRows }, { data: tagRows }] = await Promise.all([
    supabase.from("game_categories").select("category_id").eq("game_id", gameId),
    supabase.from("game_tags").select("tags(name, slug)").eq("game_id", gameId),
  ]);
  const categoryIds = Array.isArray(categoryRows)
    ? categoryRows.flatMap((row) => typeof row.category_id === "string" ? [row.category_id] : [])
    : [];
  const tags = mapTaxonomyRows(tagRows, "tags").map((tag) => tag.name);
  return { categoryIds, tags };
}

const getPublishedGameBySlugCached = unstable_cache(async function getPublishedGameBySlug(slug: string): Promise<Game | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return fallbackGames.find((game) => game.slug === slug) ?? null;
  }

  const { data, error } = await measuredQuery("games.published.by-slug", supabase
    .from("games")
    .select(`${publicGameSelect},primary_category_id,og_image_url,is_indexable,is_broken`)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle());

  if (error || !data) {
    return fallbackGames.find((game) => game.slug === slug) ?? null;
  }

  return mapGameRow(data as unknown as GameRow);
}, ["published-game-by-slug"], { revalidate: 3600, tags: ["games"] });
export const getPublishedGameBySlug = cache(getPublishedGameBySlugCached);

const getPublishedGameDetailBySlugCached = unstable_cache(async function getPublishedGameDetailBySlug(slug: string): Promise<GameDetail | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    const game = fallbackGames.find((item) => item.slug === slug) ?? null;
    if (!game) return null;
    return {
      game,
      categories: game.categories.map((categorySlug) => ({ name: categorySlug, slug: categorySlug })),
      tags: game.tags.map((tagSlug) => ({ name: tagSlug, slug: tagSlug })),
    };
  }

  const { data: rpcData, error: rpcError } = await measuredQuery("games.published.detail-rpc", supabase.rpc("get_public_game_detail", {
    p_slug: slug,
  }));

  if (!rpcError && rpcData && typeof rpcData === "object") {
    const result = rpcData as PublicGameDetailRpc;
    if (result.game) {
      const game = mapGameRow(result.game);
      const categories = prioritizeTaxonomy(mapTaxonomyItems(result.categories), game.primaryCategoryId);
      const tags = mapTaxonomyItems(result.tags);

      return {
        game: {
          ...game,
          categories: categories.map((category) => category.slug),
          tags: tags.map((tag) => tag.name),
        },
        categories,
        tags,
      };
    }
  }

  const game = await getPublishedGameBySlug(slug);
  if (!game) return null;

  const [{ data: categoryRows }, { data: tagRows }] = await Promise.all([
    measuredQuery("games.published.detail-categories", supabase
      .from("game_categories")
      .select("categories(id, name, slug)")
      .eq("game_id", game.id)),
    measuredQuery("games.published.detail-tags", supabase
      .from("game_tags")
      .select("tags(id, name, slug)")
      .eq("game_id", game.id)),
  ]);

  const categories = prioritizeTaxonomy(mapTaxonomyRows(categoryRows, "categories"), game.primaryCategoryId);
  const tags = mapTaxonomyRows(tagRows, "tags");

  return {
    game: {
      ...game,
      categories: categories.map((category) => category.slug),
      tags: tags.map((tag) => tag.name),
    },
    categories,
    tags,
  };
}, ["published-game-detail"], { revalidate: 3600, tags: ["games", "categories", "tags"] });
export const getPublishedGameDetailBySlug = cache(getPublishedGameDetailBySlugCached);

const getPublicGamePageBySlugCached = unstable_cache(async function getPublicGamePageBySlugCached(slug: string): Promise<PublicGamePageSnapshot | null> {
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const { data, error } = await measuredQuery("games.public.page-rpc", supabase.rpc("get_public_game_page", { p_slug: slug }));
    if (!error && data && typeof data === "object") {
      const result = data as PublicGamePageRpc;
      if (result.game) {
        const game = mapGameRow(result.game);
        const categories = prioritizeTaxonomy(mapTaxonomyItems(result.categories), game.primaryCategoryId);
        const tags = mapTaxonomyItems(result.tags);
        return {
          game: {
            ...game,
            categories: categories.map((category) => category.slug),
            tags: tags.map((tag) => tag.name),
          },
          categories,
          tags,
          relatedGames: (Array.isArray(result.related_games) ? result.related_games : []).map(mapGameRow),
          latestCategoryGames: (Array.isArray(result.latest_category_games) ? result.latest_category_games : []).map(mapGameRow),
          popularCategoryGames: (Array.isArray(result.popular_category_games) ? result.popular_category_games : []).map(mapGameRow),
        };
      }
    }
  }

  const detail = await getPublishedGameDetailBySlug(slug);
  if (!detail) return null;
  const primaryCategory = detail.categories[0];
  const [relatedGames, categoryGames] = await Promise.all([
    getRelatedPublishedGames(detail.game.id, 4),
    primaryCategory ? getPublishedGamesByCategorySlug(primaryCategory.slug, 12) : Promise.resolve([]),
  ]);
  const withoutCurrent = categoryGames.filter((game) => game.id !== detail.game.id);
  return {
    ...detail,
    relatedGames,
    latestCategoryGames: withoutCurrent.slice(0, 4),
    popularCategoryGames: withoutCurrent.toSorted((left, right) => right.playCount - left.playCount).slice(0, 4),
  };
}, ["public-game-page-snapshot-v1"], { revalidate: 3600, tags: ["games", "categories", "tags"] });

export const getPublicGamePageBySlug = cache(getPublicGamePageBySlugCached);

export async function searchPublishedGames(query: string, page = 1, perPage = 24): Promise<{ items: Game[]; total: number }> {
  const normalized = query.trim().slice(0, 80);
  if (!normalized) return { items: [], total: 0 };

  const fallbackMatches = fallbackGames.filter((game) => {
    const haystack = [game.title, game.shortDescription, game.longDescription, ...game.tags]
      .join(" ")
      .toLocaleLowerCase("tr");
    return haystack.includes(normalized.toLocaleLowerCase("tr"));
  });
  const supabase = createSupabaseServiceClient();
  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.min(Math.max(1, Math.floor(perPage)), 24);
  if (!supabase) {
    const from = (safePage - 1) * safePerPage;
    return { items: fallbackMatches.slice(from, from + safePerPage), total: fallbackMatches.length };
  }

  const { data, error } = await measuredQuery("games.search.page-rpc", supabase.rpc("search_published_games", {
    p_query: normalized,
    p_limit: safePerPage,
    p_offset: (safePage - 1) * safePerPage,
  }));
  if (error || !data || typeof data !== "object") return { items: [], total: 0 };

  const result = data as PublicGameSearchRpc;
  return {
    items: Array.isArray(result.items) ? result.items.map(mapGameRow) : [],
    total: Number(result.total ?? 0),
  };
}

const searchPublishedGameSuggestionsCached = unstable_cache(async function searchPublishedGameSuggestions(query: string, limit = 6): Promise<GameSearchSuggestion[]> {
  const normalized = query.trim().slice(0, 80);
  if (normalized.length < 3) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const fallbackMatches = fallbackGames
    .filter((game) => game.status === "published" && game.title.toLocaleLowerCase("tr").includes(normalized.toLocaleLowerCase("tr")))
    .slice(0, safeLimit)
    .map(mapGameSearchSuggestion);
  const supabase = createSupabaseServiceClient();
  if (!supabase) return fallbackMatches;

  const { data, error } = await measuredQuery("games.search.suggestions-rpc", supabase.rpc("search_published_games", {
    p_query: normalized,
    p_limit: safeLimit,
    p_offset: 0,
  }));

  if (error || !data || typeof data !== "object") return fallbackMatches;
  const result = data as PublicGameSearchRpc;
  return (Array.isArray(result.items) ? result.items : []).map((game) => ({
    id: game.id,
    title: game.title,
    slug: game.slug,
    thumbnailUrl: normalizeGameThumbnail(game.thumbnail_url),
    shortDescription: game.short_description ?? "",
  }));
}, ["search-published-game-suggestions-v2"], { revalidate: 300, tags: ["games"] });
export const searchPublishedGameSuggestions = cache(searchPublishedGameSuggestionsCached);

const getPopularGameSuggestionsCached = unstable_cache(async function getPopularGameSuggestions(limit = 5): Promise<GameSearchSuggestion[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const fallbackMatches = fallbackGames
    .filter((game) => game.status === "published")
    .sort((left, right) => right.playCount - left.playCount)
    .slice(0, safeLimit)
    .map(mapGameSearchSuggestion);
  const supabase = createSupabaseServiceClient();
  if (!supabase) return fallbackMatches;

  const { data, error } = await measuredQuery("games.search.popular_suggestions", supabase
    .from("games")
    .select("id, title, slug, thumbnail_url, short_description")
    .eq("status", "published")
    .order("play_count", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(safeLimit));

  if (error || !data) return fallbackMatches;

  return (data as GameSearchSuggestionRow[]).map((game) => ({
    id: game.id,
    title: game.title,
    slug: game.slug,
    thumbnailUrl: normalizeGameThumbnail(game.thumbnail_url),
    shortDescription: game.short_description ?? "",
  }));
}, ["popular-game-suggestions-v1"], { revalidate: 300, tags: ["games"] });
export const getPopularGameSuggestions = cache(getPopularGameSuggestionsCached);

const getPublishedGamesByIdKeyCached = unstable_cache(async function getPublishedGamesByIdKey(idKey: string): Promise<Game[]> {
  const ids = idKey.split(",").filter(Boolean);
  const supabase = createSupabaseServiceClient();
  if (!supabase || ids.length === 0) return [];

  const { data, error } = await measuredQuery("games.published.by-ids", supabase
    .from("games")
    .select(publicGameCardSelect)
    .eq("status", "published")
    .in("id", ids));

  if (error || !data) return [];
  return (data as unknown as GameRow[]).map(mapGameRow);
}, ["published-games-by-id-key-v1"], { revalidate: 3600, tags: ["games"] });

export async function getPublishedGamesByIds(ids: string[]): Promise<Game[]> {
  const normalizedIds = normalizeGameIds(ids);
  if (!normalizedIds.length) return [];

  const games = await getPublishedGamesByIdKeyCached(normalizedIds.join(","));
  const byId = new Map(games.map((game) => [game.id, game]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

async function getAdminPopularGameRowsByIds(ids: string[]): Promise<AdminPopularGameRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase || ids.length === 0) return [];

  const { data, error } = await supabase
    .from("games")
    .select("id, title, slug, thumbnail_url, play_count, likes_count, dislikes_count, rating_avg, rating_count")
    .eq("status", "published")
    .in("id", ids);

  if (error || !data) return [];
  return data as AdminPopularGameRow[];
}

export async function updateAdminGame(id: string, input: GameUpdateInput) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client yok.");
  }
  const { security } = await getPublicSettings();
  const source = input.game_type === "iframe" ? input.embed_url : input.game_type === "html5" ? input.html5_url : input.game_type === "swf" ? input.swf_url : input.external_url;
  if (!isGameSourceAllowed(source, security)) throw new Error("Oyun kaynağı iframe domain izin listesinde değil.");

  const categoryIds = [...new Set([...input.category_ids, input.primary_category_id].filter(Boolean))];
  const cleanTags = [...new Set(input.tags.map((tag) => tag.trim()).filter((tag) => tag.length >= 2))].slice(0, 12);
  const { category_ids: _categoryIds, tags: _tags, ...gameFields } = input;
  void _categoryIds;
  void _tags;
  const { error } = await supabase.rpc("update_game_atomic", {
    p_game_id: id,
    p_game: {
      ...gameFields,
      embed_url: input.embed_url || null,
      swf_url: input.swf_url || null,
      html5_url: input.html5_url || null,
      external_url: input.external_url || null,
      thumbnail_url: input.thumbnail_url || null,
      primary_category_id: input.primary_category_id || null,
      og_image_url: input.og_image_url || null,
    },
    p_category_ids: categoryIds,
    p_tags: cleanTags.map((name) => ({ name, slug: slugify(name) })).filter((tag) => tag.slug),
  });

  if (error) {
    throw new Error(`Oyun guncellenemedi: ${error.message}`);
  }
}

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

function prioritizeTaxonomy(items: GameTaxonomyLink[], primaryCategoryId?: string) {
  if (!primaryCategoryId) return items;
  return [...items].sort((left, right) => {
    const leftPrimary = left.id === primaryCategoryId ? 1 : 0;
    const rightPrimary = right.id === primaryCategoryId ? 1 : 0;
    return rightPrimary - leftPrimary;
  });
}

function mapGameSearchSuggestion(game: Game): GameSearchSuggestion {
  return {
    id: game.id,
    title: game.title,
    slug: game.slug,
    thumbnailUrl: game.thumbnailUrl,
    shortDescription: game.shortDescription,
  };
}

function normalizeGameThumbnail(value: string | null | undefined, fallback = "/thumbnails/space.svg") {
  return normalizeSiteAssetUrl(value) ?? fallback;
}

function mapAdminPopularGame(row: AdminPopularGameRow, favoriteCount: number): AdminPopularGame {
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
    popularityScore: calculatePopularityScore({
      playCount,
      favoriteCount,
      likesCount,
      dislikesCount,
      ratingAvg,
      ratingCount,
    }),
  };
}

async function getPrimaryCategoryNamesByGameId(gameIds: string[]): Promise<Map<string, string>> {
  const categoryNames = new Map<string, string>();
  const supabase = createSupabaseServiceClient();
  if (!supabase || gameIds.length === 0) return categoryNames;

  const { data, error } = await supabase
    .from("game_categories")
    .select("game_id, categories(name)")
    .in("game_id", gameIds);

  if (error || !data) return categoryNames;

  for (const row of data as AdminPopularGameCategoryRow[]) {
    if (categoryNames.has(row.game_id)) continue;
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    const name = category?.name?.trim();
    if (name) categoryNames.set(row.game_id, name);
  }

  return categoryNames;
}

function countFavoritesByGameId(rows: unknown) {
  const counts = new Map<string, number>();
  if (!Array.isArray(rows)) return counts;

  for (const row of rows as FavoriteGameRow[]) {
    if (!row.game_id) continue;
    counts.set(row.game_id, (counts.get(row.game_id) ?? 0) + 1);
  }

  return counts;
}

function calculatePopularityScore({
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
  return playCount + favoriteCount * 60 + likesCount * 25 + ratingCount * 8 + ratingAvg * 5 - dislikesCount * 15;
}

function sortPopularGames(left: AdminPopularGame, right: AdminPopularGame) {
  return right.popularityScore - left.popularityScore || right.playCount - left.playCount || left.title.localeCompare(right.title, "tr");
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

function mapTaxonomyRows(rows: unknown, key: "categories" | "tags"): GameTaxonomyLink[] {
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

function mapTaxonomyItems(items: unknown): GameTaxonomyLink[] {
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

function mapIdRows(rows: unknown, key: "category_id" | "tag_id") {
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = (row as Record<string, unknown>)[key];
    return typeof value === "string" && value ? [value] : [];
  });
}

function normalizeGameIds(ids: string[]) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))].sort();
}

function scoreRelatedGameIds(items: { id: string; score: number }[]) {
  const scores = new Map<string, number>();
  for (const item of items) {
    scores.set(item.id, (scores.get(item.id) ?? 0) + item.score);
  }

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

function pickRandomItem<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { games as fallbackGames } from "@/lib/data";
import { allowPublicDemoData, publicDataUnavailable } from "@/lib/public-data-guard";
import type { Game, GameSearchSuggestion } from "@/types/game";
import { normalizePublicCategoryRow, type CategoryRow } from "@/lib/db-categories";
import { measuredQuery } from "@/lib/query-observability";
import { mergePrebuildSlugs, PUBLIC_PREBUILD_LIMITS } from "@/lib/prebuild-policy";
import {
  mapGameRow,
  mapGameSearchSuggestion,
  mapIdRows,
  mapTaxonomyItems,
  mapTaxonomyRows,
  normalizeGameIds,
  normalizeGameThumbnail,
  pickRandomItem,
  prioritizeTaxonomy,
  restoreRequestedGameOrder,
  rankRelatedGameCandidates,
  type GameDetail,
  type GameRow,
  type PublicGamePageSnapshot,
} from "@/lib/games/model";

export type { GameTaxonomyLink } from "@/lib/games/model";

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

type GameRelationRow = {
  game_id: string;
  category_id?: string;
  tag_id?: string;
};

type CategoryGameOrder = "latest" | "popular";

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

const getPopularPublishedGamesCached = unstable_cache(async function getPopularPublishedGames(limit = 12): Promise<Game[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    if (!allowPublicDemoData()) {
      throw publicDataUnavailable("Popüler oyunlar", "Supabase yapılandırması eksik");
    }
    return fallbackGames
      .filter((game) => game.status === "published")
      .toSorted((left, right) => right.playCount - left.playCount)
      .slice(0, safeLimit);
  }

  let { data, error } = await measuredQuery("games.published.popular", supabase
    .from("games")
    .select(publicGameCardSelect)
    .eq("status", "published")
    .order("popularity_score", { ascending: false })
    .order("play_count", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(safeLimit));

  if (error?.message.includes("popularity_score")) {
    ({ data, error } = await measuredQuery("games.published.popular.legacy", supabase
      .from("games")
      .select(publicGameCardSelect)
      .eq("status", "published")
      .order("play_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(safeLimit)));
  }

  if (error) {
    if (!allowPublicDemoData()) {
      throw publicDataUnavailable("Popüler oyunlar", error.message);
    }
    return fallbackGames
      .filter((game) => game.status === "published")
      .toSorted((left, right) => right.playCount - left.playCount)
      .slice(0, safeLimit);
  }

  return (data as unknown as GameRow[] | null)?.map(mapGameRow) ?? [];
}, ["popular-published-game-cards-v2"], { revalidate: 3600, tags: ["games"] });
export const getPopularPublishedGames = cache(getPopularPublishedGamesCached);

async function getCategoryRecommendationGames(categoryId: string, currentGameId: string, order: CategoryGameOrder, limit = 25): Promise<Game[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  let query = supabase
    .from("games")
    .select(`${publicGameCardSelect},game_categories!inner(category_id)`)
    .eq("status", "published")
    .eq("game_categories.category_id", categoryId)
    .neq("id", currentGameId);

  query = order === "popular"
    ? query.order("popularity_score", { ascending: false }).order("play_count", { ascending: false })
    : query.order("created_at", { ascending: false }).order("id", { ascending: false });

  let { data, error } = await measuredQuery(`games.category-recommendations.${order}`, query.limit(limit));
  if (order === "popular" && error?.message.includes("popularity_score")) {
    ({ data, error } = await measuredQuery("games.category-recommendations.popular.legacy", supabase
      .from("games")
      .select(`${publicGameCardSelect},game_categories!inner(category_id)`)
      .eq("status", "published")
      .eq("game_categories.category_id", categoryId)
      .neq("id", currentGameId)
      .order("play_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit)));
  }
  if (error || !data) return [];
  return (data as unknown as GameRow[]).map(mapGameRow);
}

const getTrendingPublishedGamesCached = unstable_cache(async function getTrendingPublishedGames(limit = 12): Promise<Game[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    if (!allowPublicDemoData()) {
      throw publicDataUnavailable("Trend oyunlar", "Supabase yapılandırması eksik");
    }
    return fallbackGames
      .filter((game) => game.status === "published")
      .toSorted((left, right) => (right.likesCount + right.playCount / 20) - (left.likesCount + left.playCount / 20))
      .slice(0, safeLimit);
  }

  const { data, error } = await measuredQuery("games.published.trending", supabase.rpc("get_trending_published_games", {
    p_limit: safeLimit,
  }));

  if (error) {
    if (!allowPublicDemoData()) {
      console.error("Trend oyunlar sorgusu başarısız; gerçek popüler oyunlar kullanılıyor.", error.message);
      return getPopularPublishedGames(safeLimit);
    }
    return fallbackGames
      .filter((game) => game.status === "published")
      .toSorted((left, right) => (right.likesCount + right.playCount / 20) - (left.likesCount + left.playCount / 20))
      .slice(0, safeLimit);
  }

  return (Array.isArray(data) ? data : []).map((row) => mapGameRow(row as GameRow));
}, ["trending-published-game-cards-v1"], { revalidate: 3600, tags: ["games"] });
export const getTrendingPublishedGames = cache(getTrendingPublishedGamesCached);

export async function getPrebuildGameSlugs(): Promise<Array<{ slug: string }>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return mergePrebuildSlugs([fallbackGames], PUBLIC_PREBUILD_LIMITS.games);

  const [initialPopular, latest] = await Promise.all([
    supabase.from("games").select("slug").eq("status", "published").order("popularity_score", { ascending: false }).order("play_count", { ascending: false }).limit(PUBLIC_PREBUILD_LIMITS.popularGames),
    supabase.from("games").select("slug").eq("status", "published").order("created_at", { ascending: false }).limit(PUBLIC_PREBUILD_LIMITS.latestGames),
  ]);
  let popular = initialPopular;
  if (popular.error?.message.includes("popularity_score")) {
    popular = await supabase.from("games").select("slug").eq("status", "published").order("play_count", { ascending: false }).limit(PUBLIC_PREBUILD_LIMITS.popularGames);
  }
  return mergePrebuildSlugs([popular.data ?? [], latest.data ?? []], PUBLIC_PREBUILD_LIMITS.games);
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

const getRelatedPublishedGamesCached = unstable_cache(async function getRelatedPublishedGames(gameId: string, limit = 4, primaryCategoryId?: string): Promise<Game[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    const currentGame = fallbackGames.find((game) => game.id === gameId);
    if (!currentGame) return [];
    return fallbackGames
      .filter((game) => game.id !== gameId)
      .map((game) => ({
        game,
        score: game.categories.filter((category) => currentGame.categories.includes(category)).length * 100
          + game.tags.filter((tag) => currentGame.tags.includes(tag)).length * 35,
      }))
      .filter(({ score }) => score > 0)
      .toSorted((left, right) => right.score - left.score || right.game.playCount - left.game.playCount)
      .slice(0, limit)
      .map(({ game }) => game);
  }

  const [{ data: categoryLinks }, { data: tagLinks }] = await Promise.all([
    measuredQuery("games.related.category-links", supabase.from("game_categories").select("category_id").eq("game_id", gameId)),
    measuredQuery("games.related.tag-links", supabase.from("game_tags").select("tag_id").eq("game_id", gameId)),
  ]);

  const categoryIds = mapIdRows(categoryLinks, "category_id");
  const tagIds = mapIdRows(tagLinks, "tag_id");

  const [relatedByCategory, relatedByTag] = await Promise.all([
    categoryIds.length
      ? measuredQuery("games.related.by-category", supabase.from("game_categories").select("game_id, category_id").in("category_id", categoryIds).neq("game_id", gameId).limit(1000))
      : Promise.resolve({ data: [] as GameRelationRow[] }),
    tagIds.length
      ? measuredQuery("games.related.by-tag", supabase.from("game_tags").select("game_id, tag_id").in("tag_id", tagIds).neq("game_id", gameId).limit(1000))
      : Promise.resolve({ data: [] as GameRelationRow[] }),
  ]);

  const scoredIds = rankRelatedGameCandidates({
    primaryCategoryId,
    categoryLinks: ((relatedByCategory.data ?? []) as GameRelationRow[]).flatMap((row) => row.category_id ? [{ gameId: row.game_id, taxonomyId: row.category_id }] : []),
    tagLinks: ((relatedByTag.data ?? []) as GameRelationRow[]).flatMap((row) => row.tag_id ? [{ gameId: row.game_id, taxonomyId: row.tag_id }] : []),
  }).slice(0, limit * 6);

  const relatedGames = scoredIds.length
    ? await getPublishedGamesByIds(scoredIds.map((item) => item.id))
    : [];

  const byId = new Map(relatedGames.map((game) => [game.id, game]));
  const sorted = scoredIds.flatMap((item) => {
    const game = byId.get(item.id);
    if (!game) return [];
    const popularityBoost = Math.min(8, Math.log10(game.playCount + 1) * 2) + game.ratingAvg * 0.5;
    return [{ game, score: item.score + popularityBoost }];
  }).toSorted((left, right) => right.score - left.score || right.game.playCount - left.game.playCount || left.game.title.localeCompare(right.game.title, "tr"));

  if (sorted.length) return sorted.slice(0, limit).map(({ game }) => game);
  if (!categoryIds.length && !tagIds.length) {
    return (await getPopularPublishedGames(limit + 1)).filter((game) => game.id !== gameId).slice(0, limit);
  }
  return [];
}, ["related-published-games-v2"], { revalidate: 3600, tags: ["games", "categories", "tags"] });
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
        const primaryCategory = categories[0];
        const [expandedRelatedGames, expandedLatestGames, expandedPopularGames] = await Promise.all([
          getRelatedPublishedGames(game.id, 25, game.primaryCategoryId),
          primaryCategory?.id ? getCategoryRecommendationGames(primaryCategory.id, game.id, "latest", 25) : Promise.resolve([]),
          primaryCategory?.id ? getCategoryRecommendationGames(primaryCategory.id, game.id, "popular", 25) : Promise.resolve([]),
        ]);
        return {
          game: {
            ...game,
            categories: categories.map((category) => category.slug),
            tags: tags.map((tag) => tag.name),
          },
          categories,
          tags,
          relatedGames: expandedRelatedGames,
          latestCategoryGames: expandedLatestGames,
          popularCategoryGames: expandedPopularGames,
        };
      }
    }
  }

  const detail = await getPublishedGameDetailBySlug(slug);
  if (!detail) return null;
  const primaryCategory = detail.categories[0];
  const [relatedGames, categoryGames] = await Promise.all([
    getRelatedPublishedGames(detail.game.id, 25, detail.game.primaryCategoryId),
    primaryCategory ? getPublishedGamesByCategorySlug(primaryCategory.slug, 60) : Promise.resolve([]),
  ]);
  const withoutCurrent = categoryGames.filter((game) => game.id !== detail.game.id);
  return {
    ...detail,
    relatedGames,
    latestCategoryGames: withoutCurrent.slice(0, 25),
    popularCategoryGames: withoutCurrent.toSorted((left, right) => right.playCount - left.playCount).slice(0, 25),
  };
}, ["public-game-page-snapshot-v3"], { revalidate: 3600, tags: ["games", "categories", "tags"] });

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
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  let { data, error } = await measuredQuery("games.search.popular_suggestions", supabase
    .from("games")
    .select("id, title, slug, thumbnail_url, short_description")
    .eq("status", "published")
    .order("popularity_score", { ascending: false })
    .order("play_count", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(safeLimit));

  if (error?.message.includes("popularity_score")) {
    ({ data, error } = await measuredQuery("games.search.popular_suggestions.legacy", supabase
      .from("games")
      .select("id, title, slug, thumbnail_url, short_description")
      .eq("status", "published")
      .order("play_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(safeLimit)));
  }

  if (error || !data) return [];

  return (data as GameSearchSuggestionRow[]).map((game) => ({
    id: game.id,
    title: game.title,
    slug: game.slug,
    thumbnailUrl: normalizeGameThumbnail(game.thumbnail_url),
    shortDescription: game.short_description ?? "",
  }));
}, ["popular-game-suggestions-v2"], { revalidate: 300, tags: ["games"] });
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
  return restoreRequestedGameOrder(ids, games);
}

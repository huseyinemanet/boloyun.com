import "server-only";

import { games as fallbackGames } from "@/lib/data";
import { getPublicSettings } from "@/lib/db-settings";
import {
  calculatePopularityScore,
  mapAdminPopularGame,
  mapGameRow,
  mapTaxonomyRows,
  normalizeGameThumbnail,
  sortPopularGames,
  type AdminPopularGame,
  type AdminPopularGameRow,
  type GameRow,
} from "@/lib/games/model";
import { keysetFilter, type KeysetCursor, type KeysetDirection } from "@/lib/keyset-pagination";
import { measuredQuery } from "@/lib/query-observability";
import { isGameSourceAllowed } from "@/lib/settings/game-security";
import { slugify } from "@/lib/slug/slugify";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import type { Game, GameType, PublishStatus } from "@/types/game";

export type { AdminPopularGame } from "@/lib/games/model";

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

export type AdminGameListItem = Pick<Game, "id" | "title" | "slug" | "shortDescription" | "thumbnailUrl" | "status" | "playCount" | "isBroken" | "thumbnailSyncStatus"> & {
  updatedAt: string;
};

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

  const { data } = await supabase
    .from("games")
    .select("id, title, slug, thumbnail_url, play_count, favorite_count, likes_count, dislikes_count, rating_avg, rating_count, popularity_score")
    .eq("status", "published")
    .order("popularity_score", { ascending: false })
    .order("play_count", { ascending: false })
    .limit(limit);

  const popularGames = ((data ?? []) as AdminPopularGameRow[]).map((row) => mapAdminPopularGame(row));

  const categoryNames = await getPrimaryCategoryNamesByGameId(popularGames.map((game) => game.id));
  return popularGames.map((game) => ({ ...game, categoryName: categoryNames.get(game.id) ?? "" }));
}

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

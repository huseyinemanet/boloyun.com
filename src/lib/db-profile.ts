import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { normalizeSiteAssetUrl } from "@/lib/site-assets";

export type ProfileGameItem = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
};

export type ProfileCommentItem = {
  id: string;
  body: string;
  status: string;
  gameTitle: string;
  gameSlug: string;
  gameThumbnailUrl: string;
  createdAt: string;
};

type FavoriteRow = {
  created_at: string | null;
  games?: GameRow | GameRow[] | null;
};

type PlayRow = {
  last_played_at: string | null;
  games?: GameRow | GameRow[] | null;
};

type CommentRow = {
  id: string;
  body: string;
  status: string | null;
  created_at: string | null;
  games?: Pick<GameRow, "title" | "slug" | "thumbnail_url"> | Array<Pick<GameRow, "title" | "slug" | "thumbnail_url">> | null;
};

type GameRow = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
};

export async function getProfileFavorites(profileId: string, limit = 12): Promise<ProfileGameItem[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("favorites")
    .select("created_at, games(id, title, slug, thumbnail_url)")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return uniqueGames(((data ?? []) as FavoriteRow[]).flatMap((row) => mapGameItem(row.games)));
}

export async function getProfileRecentGames(profileId: string, limit = 12): Promise<ProfileGameItem[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("game_plays")
    .select("last_played_at, games(id, title, slug, thumbnail_url)")
    .eq("user_id", profileId)
    .order("last_played_at", { ascending: false })
    .limit(Math.max(limit * 4, 48));

  return uniqueGames(((data ?? []) as PlayRow[]).flatMap((row) => mapGameItem(row.games))).slice(0, limit);
}

export async function getProfileComments(profileId: string, limit = 10): Promise<ProfileCommentItem[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("comments")
    .select("id, body, status, created_at, games(title, slug, thumbnail_url)")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as CommentRow[]).map((row) => {
    const game = Array.isArray(row.games) ? row.games[0] : row.games;
    return {
      id: row.id,
      body: row.body,
      status: row.status ?? "pending",
      gameTitle: game?.title ?? "Oyun",
      gameSlug: game?.slug ?? "",
      gameThumbnailUrl: normalizeSiteAssetUrl(game?.thumbnail_url) || "/thumbnails/puzzle.svg",
      createdAt: row.created_at ?? new Date().toISOString(),
    };
  });
}

function mapGameItem(gameValue: FavoriteRow["games"]): ProfileGameItem[] {
  const game = Array.isArray(gameValue) ? gameValue[0] : gameValue;
  if (!game) return [];
  return [{
    id: game.id,
    title: game.title,
    slug: game.slug,
    thumbnailUrl: normalizeSiteAssetUrl(game.thumbnail_url) || "/thumbnails/puzzle.svg",
  }];
}

function uniqueGames(games: ProfileGameItem[]): ProfileGameItem[] {
  const seenIds = new Set<string>();
  return games.filter((game) => {
    if (seenIds.has(game.id)) return false;
    seenIds.add(game.id);
    return true;
  });
}

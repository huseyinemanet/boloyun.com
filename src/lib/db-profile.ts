import { createSupabaseServiceClient } from "@/lib/supabase/client";

export type ProfileGameItem = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  date: string;
};

export type ProfileCommentItem = {
  id: string;
  body: string;
  status: string;
  gameTitle: string;
  gameSlug: string;
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
  games?: Pick<GameRow, "title" | "slug"> | Array<Pick<GameRow, "title" | "slug">> | null;
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

  return ((data ?? []) as FavoriteRow[]).flatMap((row) => mapGameItem(row.games, row.created_at));
}

export async function getProfileRecentGames(profileId: string, limit = 12): Promise<ProfileGameItem[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("game_plays")
    .select("last_played_at, games(id, title, slug, thumbnail_url)")
    .eq("user_id", profileId)
    .order("last_played_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as PlayRow[]).flatMap((row) => mapGameItem(row.games, row.last_played_at));
}

export async function getProfileComments(profileId: string, limit = 10): Promise<ProfileCommentItem[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("comments")
    .select("id, body, status, created_at, games(title, slug)")
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
      createdAt: row.created_at ?? new Date().toISOString(),
    };
  });
}

function mapGameItem(gameValue: FavoriteRow["games"], date: string | null): ProfileGameItem[] {
  const game = Array.isArray(gameValue) ? gameValue[0] : gameValue;
  if (!game) return [];
  return [{
    id: game.id,
    title: game.title,
    slug: game.slug,
    thumbnailUrl: game.thumbnail_url || "/thumbnails/puzzle.svg",
    date: date ?? new Date().toISOString(),
  }];
}

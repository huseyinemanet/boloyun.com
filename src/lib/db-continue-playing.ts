import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { normalizeSiteAssetUrl } from "@/lib/site-assets";

export const CONTINUE_PLAYING_LIMIT = 6;

export type ContinuePlayingGame = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
};

export type ContinuePlayingRow = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  last_played_at: string;
};

export async function getContinuePlayingGames({
  profileId,
  sessionId,
  limit = CONTINUE_PLAYING_LIMIT,
}: {
  profileId?: string;
  sessionId?: string;
  limit?: number;
}): Promise<ContinuePlayingGame[]> {
  if (!profileId && !sessionId) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_continue_playing_games", {
    p_profile_id: profileId ?? null,
    p_session_id: sessionId ?? null,
    p_limit: normalizeContinuePlayingLimit(limit),
  });
  if (error) throw new Error(`Oynamaya devam et listesi alınamadı: ${error.message}`);

  return mapContinuePlayingRows((data ?? []) as ContinuePlayingRow[]);
}

export function normalizeContinuePlayingLimit(limit: number) {
  if (!Number.isFinite(limit)) return CONTINUE_PLAYING_LIMIT;
  return Math.max(1, Math.min(Math.trunc(limit), 12));
}

export function mapContinuePlayingRows(rows: ContinuePlayingRow[]): ContinuePlayingGame[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    thumbnailUrl: normalizeSiteAssetUrl(row.thumbnail_url) || "/thumbnails/puzzle.svg",
  }));
}

export async function migrateSessionGamePlaysToProfile(sessionId: string, profileId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("migrate_session_game_plays_to_profile", {
    p_session_id: sessionId,
    p_profile_id: profileId,
  });
  if (error) throw new Error(`Oyun geçmişi hesaba aktarılamadı: ${error.message}`);
  return Number(data ?? 0);
}

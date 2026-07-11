import { cache } from "react";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export type GameVote = "like" | "dislike";

export type GameVoteStats = {
  likesCount: number;
  dislikesCount: number;
  ratingCount: number;
  ratingAvg: number;
};

type VoteRow = {
  vote: GameVote;
};

export const getGameVoteForSession = cache(async function getGameVoteForSession(gameId: string, sessionId: string): Promise<GameVote | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("game_reactions")
    .select("vote")
    .eq("game_id", gameId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !data) return null;
  return (data as VoteRow).vote;
});

export async function upsertGameVote(gameId: string, sessionId: string, vote: GameVote): Promise<GameVoteStats> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { data, error } = await supabase.rpc("upsert_game_vote_atomic", {
    p_game_id: gameId,
    p_session_id: sessionId,
    p_vote: vote,
  });
  if (error) throw new Error(`Oy kaydedilemedi: ${error.message}`);
  const value = data as Partial<GameVoteStats> | null;
  return {
    likesCount: Number(value?.likesCount ?? 0),
    dislikesCount: Number(value?.dislikesCount ?? 0),
    ratingCount: Number(value?.ratingCount ?? 0),
    ratingAvg: Number(value?.ratingAvg ?? 0),
  };
}

export async function recalculateGameVoteStats(gameId: string): Promise<GameVoteStats> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const [likesResult, dislikesResult] = await Promise.all([
    supabase
      .from("game_reactions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("vote", "like"),
    supabase
      .from("game_reactions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("vote", "dislike"),
  ]);

  if (likesResult.error) throw new Error(`Like sayisi okunamadi: ${likesResult.error.message}`);
  if (dislikesResult.error) throw new Error(`Dislike sayisi okunamadi: ${dislikesResult.error.message}`);

  const likesCount = likesResult.count ?? 0;
  const dislikesCount = dislikesResult.count ?? 0;
  const ratingCount = likesCount + dislikesCount;
  const ratingAvg = ratingCount ? Number(((likesCount / ratingCount) * 5).toFixed(2)) : 0;

  const { error: updateError } = await supabase
    .from("games")
    .update({
      likes_count: likesCount,
      dislikes_count: dislikesCount,
      rating_count: ratingCount,
      rating_avg: ratingAvg,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  if (updateError) {
    throw new Error(`Oyun puani guncellenemedi: ${updateError.message}`);
  }

  return {
    likesCount,
    dislikesCount,
    ratingCount,
    ratingAvg,
  };
}

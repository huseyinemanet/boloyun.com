import { cache } from "react";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export const gameReactions = ["like", "love", "haha", "wow", "sad", "angry"] as const;

export type GameReaction = (typeof gameReactions)[number];

export type GameReactionStats = {
  likesCount: number;
  dislikesCount: number;
  ratingCount: number;
  ratingAvg: number;
};

type ReactionRow = {
  vote: GameReaction;
};

export function isGameReaction(value: unknown): value is GameReaction {
  return typeof value === "string" && gameReactions.some((reaction) => reaction === value);
}

export const getGameReactionForSession = cache(async function getGameReactionForSession(gameId: string, sessionId: string): Promise<GameReaction | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("game_reactions")
    .select("vote")
    .eq("game_id", gameId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !data) return null;
  const reaction = (data as ReactionRow).vote;
  return isGameReaction(reaction) ? reaction : null;
});

export async function setGameReaction(gameId: string, sessionId: string, reaction: GameReaction): Promise<GameReactionStats & { selectedReaction: GameReaction | null }> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { data, error } = await supabase.rpc("set_game_reaction_atomic", {
    p_game_id: gameId,
    p_session_id: sessionId,
    p_reaction: reaction,
  });
  if (error) throw new Error(`Tepki kaydedilemedi: ${error.message}`);
  const value = data as (Partial<GameReactionStats> & { selectedReaction?: unknown }) | null;
  return {
    selectedReaction: isGameReaction(value?.selectedReaction) ? value.selectedReaction : null,
    likesCount: Number(value?.likesCount ?? 0),
    dislikesCount: Number(value?.dislikesCount ?? 0),
    ratingCount: Number(value?.ratingCount ?? 0),
    ratingAvg: Number(value?.ratingAvg ?? 0),
  };
}

export async function recalculateGameReactionStats(gameId: string): Promise<GameReactionStats> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const [likesResult, dislikesResult] = await Promise.all([
    supabase
      .from("game_reactions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .in("vote", ["like", "love", "haha", "wow"]),
    supabase
      .from("game_reactions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .in("vote", ["sad", "angry"]),
  ]);

  if (likesResult.error) throw new Error(`Olumlu reaksiyon sayısı okunamadı: ${likesResult.error.message}`);
  if (dislikesResult.error) throw new Error(`Olumsuz reaksiyon sayısı okunamadı: ${dislikesResult.error.message}`);

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

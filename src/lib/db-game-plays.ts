import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function recordGamePlay(gameId: string, sessionId: string, profileId?: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { data, error } = await supabase.rpc("record_game_play_atomic", {
    p_game_id: gameId,
    p_session_id: sessionId,
    p_profile_id: profileId ?? null,
  });
  if (error) throw new Error(`Oynanma kaydi yazilamadi: ${error.message}`);
  return Boolean(data);
}

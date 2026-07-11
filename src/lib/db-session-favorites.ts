import { cache } from "react";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export const getSessionFavorite = cache(async function getSessionFavorite(gameId: string, sessionId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("session_favorites")
    .select("id")
    .eq("game_id", gameId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !data) return false;
  return true;
});

export const getProfileFavorite = cache(async function getProfileFavorite(gameId: string, profileId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("favorites")
    .select("game_id")
    .eq("game_id", gameId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (error || !data) return false;
  return true;
});

export async function toggleSessionFavorite(gameId: string, sessionId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { data: existing, error: readError } = await supabase
    .from("session_favorites")
    .select("id")
    .eq("game_id", gameId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Favori okunamadi: ${readError.message}`);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("session_favorites")
      .delete()
      .eq("id", existing.id);

    if (error) throw new Error(`Favoriden kaldirilamadi: ${error.message}`);
    return false;
  }

  const { error } = await supabase.from("session_favorites").insert({
    game_id: gameId,
    session_id: sessionId,
  });

  if (error) throw new Error(`Favoriye eklenemedi: ${error.message}`);
  return true;
}

export async function setSessionFavorite(gameId: string, sessionId: string, desired: boolean) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { data, error } = await supabase.rpc("set_favorite_atomic", {
    p_game_id: gameId, p_profile_id: null, p_session_id: sessionId, p_desired: desired,
  });
  if (error) throw new Error(`Favori güncellenemedi: ${error.message}`);
  return Boolean(data);
}

export async function toggleProfileFavorite(gameId: string, profileId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { data: existing, error: readError } = await supabase
    .from("favorites")
    .select("game_id")
    .eq("game_id", gameId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Favori okunamadı: ${readError.message}`);
  }

  if (existing?.game_id) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("game_id", gameId)
      .eq("user_id", profileId);

    if (error) throw new Error(`Favoriden kaldırılamadı: ${error.message}`);
    return false;
  }

  const { error } = await supabase.from("favorites").insert({
    game_id: gameId,
    user_id: profileId,
  });

  if (error) throw new Error(`Favoriye eklenemedi: ${error.message}`);
  return true;
}

export async function setProfileFavorite(gameId: string, profileId: string, desired: boolean) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { data, error } = await supabase.rpc("set_favorite_atomic", {
    p_game_id: gameId, p_profile_id: profileId, p_session_id: null, p_desired: desired,
  });
  if (error) throw new Error(`Favori güncellenemedi: ${error.message}`);
  return Boolean(data);
}

export async function migrateSessionFavoritesToProfile(sessionId: string, profileId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const { error } = await supabase.rpc("migrate_session_favorites_atomic", { p_session_id: sessionId, p_profile_id: profileId });
  if (error) throw new Error(`Favoriler hesaba aktarılamadı: ${error.message}`);
}

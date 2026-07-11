import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { migrateSessionFavoritesToProfile } from "@/lib/db-session-favorites";

export async function migrateCurrentSessionFavorites(userId: string) {
  const sessionId = (await cookies()).get("mini_game_session")?.value;
  if (!sessionId) return;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const profileId = (profile as { id?: string } | null)?.id;
  if (profileId) {
    await migrateSessionFavoritesToProfile(sessionId, profileId);
  }
}

import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { migrateSessionGamePlaysToProfile } from "@/lib/db-continue-playing";
import { migrateSessionFavoritesToProfile } from "@/lib/db-session-favorites";

export async function migrateCurrentSessionActivity(userId: string) {
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
    try {
      await migrateSessionGamePlaysToProfile(sessionId, profileId);
    } catch (error) {
      console.error("[auth] session game history could not be migrated", toLogError(error));
    }
  }
}

function toLogError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

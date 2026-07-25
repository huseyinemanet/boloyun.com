import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { cacheHeaders } from "@/lib/cache-policy";
import { getGameReactionForSession } from "@/lib/db-game-reactions";
import { getProfileFavorite } from "@/lib/db-session-favorites";

const gameSessionCookie = "mini_game_session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gameId = new URL(request.url).searchParams.get("gameId") ?? "";
  if (!isUuid(gameId)) {
    return NextResponse.json(
      { isFavorite: false, selectedReaction: null, isLoggedIn: false },
      { headers: cacheHeaders("privateNoStore") },
    );
  }

  const cookieStore = await cookies();
  const profile = await getCurrentProfile();
  const sessionId = cookieStore.get(gameSessionCookie)?.value;
  const [isFavorite, selectedReaction] = await Promise.all([
    profile?.id
      ? getProfileFavorite(gameId, profile.id)
      : Promise.resolve(false),
    sessionId ? getGameReactionForSession(gameId, sessionId) : Promise.resolve(null),
  ]);

  return NextResponse.json(
    { isFavorite, selectedReaction, isLoggedIn: Boolean(profile) },
    { headers: cacheHeaders("privateNoStore") },
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

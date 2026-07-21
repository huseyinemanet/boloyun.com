import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { cacheHeaders } from "@/lib/cache-policy";
import { CONTINUE_PLAYING_LIMIT, getContinuePlayingGames } from "@/lib/db-continue-playing";

const gameSessionCookie = "mini_game_session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = validSessionId(cookieStore.get(gameSessionCookie)?.value);
  const profile = await getCurrentProfile();

  try {
    const games = await getContinuePlayingGames({
      profileId: profile?.status === "active" ? profile.id : undefined,
      sessionId,
      limit: CONTINUE_PLAYING_LIMIT,
    });
    return NextResponse.json({ games }, { headers: cacheHeaders("privateNoStore") });
  } catch (error) {
    console.error("[continue-playing] game history could not be read", toLogError(error));
    return NextResponse.json({ games: [] }, { headers: cacheHeaders("privateNoStore") });
  }
}

function validSessionId(value: string | undefined) {
  return value && value.length >= 16 && value.length <= 200 ? value : undefined;
}

function toLogError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

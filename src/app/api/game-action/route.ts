import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { cacheHeaders } from "@/lib/cache-policy";
import { isGameReaction, setGameReaction } from "@/lib/db-game-reactions";
import { setProfileFavorite, setSessionFavorite } from "@/lib/db-session-favorites";

const gameSessionCookie = "mini_game_session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return actionResponse({ error: "Geçersiz istek." }, 400);
  }

  const input = body as Partial<{ action: string; desired: boolean; gameId: string; reaction: string; vote: string }>;
  const gameId = typeof input.gameId === "string" ? input.gameId : "";
  if (!isUuid(gameId)) return actionResponse({ error: "Oyun bilgisi eksik." }, 400);

  const sessionId = await getOrCreateGameSession();
  const profile = await getCurrentProfile();

  if (input.action === "favorite") {
    const desired = Boolean(input.desired);
    const isFavorite = profile?.id
      ? await setProfileFavorite(gameId, profile.id, desired)
      : await setSessionFavorite(gameId, sessionId, desired);

    return actionResponse({ ok: true, isFavorite, isLoggedIn: Boolean(profile?.id) });
  }

  const reaction = input.action === "reaction"
    ? input.reaction
    : input.action === "vote"
      ? input.vote === "dislike" ? "angry" : input.vote
      : null;
  if ((input.action === "reaction" || input.action === "vote") && isGameReaction(reaction)) {
    try {
      const stats = await setGameReaction(gameId, sessionId, reaction);
      return actionResponse({
        ok: true,
        selectedReaction: stats.selectedReaction,
        likesCount: stats.likesCount,
        dislikesCount: stats.dislikesCount,
        isLoggedIn: Boolean(profile?.id),
      });
    } catch (error) {
      console.error("Game reaction could not be saved", {
        gameId,
        message: error instanceof Error ? error.message : "Unknown reaction error",
      });
      return actionResponse(
        { error: "Reaksiyon sistemi henüz veritabanında etkin değil. Lütfen daha sonra tekrar deneyin." },
        503,
      );
    }
  }

  return actionResponse({ error: "Geçersiz işlem." }, 400);
}

function actionResponse(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: cacheHeaders("privateNoStore") });
}

async function getOrCreateGameSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(gameSessionCookie)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  cookieStore.set(gameSessionCookie, sessionId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return sessionId;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

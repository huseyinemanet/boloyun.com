import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { consumeRateLimits, getClientIp } from "@/lib/abuse";
import { getCurrentProfile } from "@/lib/auth";
import { cacheHeaders } from "@/lib/cache-policy";
import { isGameReaction, setGameReaction } from "@/lib/db-game-reactions";
import { setProfileFavorite } from "@/lib/db-session-favorites";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

const gameSessionCookie = "mini_game_session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) {
    return actionResponse({ error: "Geçersiz istek kaynağı." }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return actionResponse({ error: "Geçersiz istek." }, 400);
  }

  const input = body as Partial<{ action: string; desired: boolean; gameId: string; reaction: string; vote: string }>;
  const gameId = typeof input.gameId === "string" ? input.gameId : "";
  if (!isUuid(gameId)) return actionResponse({ error: "Oyun bilgisi eksik." }, 400);

  const profile = await getCurrentProfile();

  if (input.action === "favorite") {
    if (!profile?.id || profile.status !== "active") {
      return actionResponse(
        {
          error: profile?.status === "blocked"
            ? "Hesabın engellenmiş. Bu işlem kullanılamıyor."
            : "Favorilere eklemek için giriş yapmalısın.",
          isLoggedIn: false,
        },
        profile?.status === "blocked" ? 403 : 401,
      );
    }

    const rate = await consumeRateLimits([
      { action: "game-favorite-user", subject: profile.id, limit: 60, windowSeconds: 3600 },
      { action: "game-favorite-ip", subject: await getClientIp(), limit: 120, windowSeconds: 3600 },
    ]);
    if (!rate.allowed) {
      return actionResponse({ error: "Çok sık favori işlemi yapıldı. Lütfen daha sonra tekrar dene." }, 429, rate.retryAfterSeconds);
    }

    const desired = Boolean(input.desired);
    const isFavorite = await setProfileFavorite(gameId, profile.id, desired);

    return actionResponse({ ok: true, isFavorite, isLoggedIn: true });
  }

  const sessionId = await getOrCreateGameSession();
  const reaction = input.action === "reaction"
    ? input.reaction
    : input.action === "vote"
      ? input.vote === "dislike" ? "angry" : input.vote
      : null;
  if ((input.action === "reaction" || input.action === "vote") && isGameReaction(reaction)) {
    try {
      const rate = await consumeRateLimits([
        { action: "game-reaction-session", subject: sessionId, limit: 20, windowSeconds: 3600 },
        { action: "game-reaction-ip", subject: await getClientIp(), limit: 60, windowSeconds: 3600 },
      ]);
      if (!rate.allowed) {
        return actionResponse({ error: "Çok sık reaksiyon gönderildi. Lütfen daha sonra tekrar dene." }, 429, rate.retryAfterSeconds);
      }

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

function actionResponse(value: unknown, status = 200, retryAfterSeconds?: number) {
  const headers = new Headers(cacheHeaders("privateNoStore"));
  if (retryAfterSeconds) headers.set("Retry-After", String(retryAfterSeconds));
  return NextResponse.json(value, { status, headers });
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

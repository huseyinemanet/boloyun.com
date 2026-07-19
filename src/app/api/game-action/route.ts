import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { consumeRateLimits, getClientIp } from "@/lib/abuse";
import { cacheHeaders } from "@/lib/cache-policy";
import { upsertGameVote, type GameVote } from "@/lib/db-game-reactions";
import { setProfileFavorite, setSessionFavorite } from "@/lib/db-session-favorites";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

const gameSessionCookie = "mini_game_session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return actionResponse({ error: "Geçersiz istek kaynağı." }, 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return actionResponse({ error: "Geçersiz istek." }, 400);
  }

  const input = body as Partial<{ action: string; desired: boolean; gameId: string; vote: string }>;
  const gameId = typeof input.gameId === "string" ? input.gameId : "";
  if (!isUuid(gameId)) return actionResponse({ error: "Oyun bilgisi eksik." }, 400);

  const { sessionId, hasAuthCookie } = await getOrCreateGameSession();
  const rate = await consumeRateLimits([
    { action: "game-action-ip", subject: await getClientIp(), limit: 120, windowSeconds: 3600 },
    { action: "game-action-session", subject: sessionId, limit: 60, windowSeconds: 3600 },
  ]);
  if (!rate.allowed) return actionResponse({ error: "Çok fazla istek gönderildi." }, 429, rate.retryAfterSeconds);
  const profile = hasAuthCookie ? await getCurrentProfile() : null;

  if (input.action === "favorite") {
    const desired = Boolean(input.desired);
    const isFavorite = profile?.id
      ? await setProfileFavorite(gameId, profile.id, desired)
      : await setSessionFavorite(gameId, sessionId, desired);

    return actionResponse({ ok: true, isFavorite, isLoggedIn: Boolean(profile?.id) });
  }

  if (input.action === "vote" && isGameVote(input.vote)) {
    const stats = await upsertGameVote(gameId, sessionId, input.vote);
    return actionResponse({
      ok: true,
      userVote: input.vote,
      likesCount: stats.likesCount,
      dislikesCount: stats.dislikesCount,
      isLoggedIn: Boolean(profile?.id),
    });
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
  const hasAuthCookie = cookieStore.getAll().some(({ name }) => isSupabaseAuthCookie(name));
  if (existing) return { sessionId: existing, hasAuthCookie };

  const sessionId = randomUUID();
  cookieStore.set(gameSessionCookie, sessionId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: true,
  });

  return { sessionId, hasAuthCookie };
}

function isSupabaseAuthCookie(name: string) {
  return /^sb-.+-auth-token(?:\.\d+)?$/.test(name) || name.startsWith("supabase-auth-token");
}

function isGameVote(value: unknown): value is GameVote {
  return value === "like" || value === "dislike";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

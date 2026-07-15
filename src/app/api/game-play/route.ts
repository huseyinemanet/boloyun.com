import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { consumeRateLimits } from "@/lib/abuse";
import { cacheHeaders } from "@/lib/cache-policy";
import { recordGamePlay } from "@/lib/db-game-plays";

const gameSessionCookie = "mini_game_session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ error: "Geçersiz istek." }, 400);
  }

  const input = body as Partial<{ gameId: string; eventId: string }>;
  if (!isUuid(input.gameId) || !isUuid(input.eventId)) {
    return response({ error: "Oyun bilgisi eksik." }, 400);
  }

  const cookieStore = await cookies();
  let sessionId = cookieStore.get(gameSessionCookie)?.value;
  if (!sessionId) {
    sessionId = randomUUID();
    cookieStore.set(gameSessionCookie, sessionId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  }

  const rate = await consumeRateLimits([
    { action: "game-play-session", subject: sessionId, limit: 120, windowSeconds: 3600 },
  ]);
  if (!rate.allowed) return response({ accepted: false }, 202);

  const hasAuthCookie = cookieStore.getAll().some(({ name }) => (
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name) || name.startsWith("supabase-auth-token")
  ));
  const profile = hasAuthCookie ? await getCurrentProfile() : null;
  await recordGamePlay(input.gameId, sessionId, input.eventId, profile?.id);

  return response({ accepted: true }, 202);
}

function response(value: unknown, status: number) {
  return NextResponse.json(value, { status, headers: cacheHeaders("privateNoStore") });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

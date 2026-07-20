import { randomUUID } from "crypto";
import { after } from "next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { abuseSubject, consumeRateLimits, getClientIp } from "@/lib/abuse";
import { getCurrentProfile } from "@/lib/auth";
import { cacheHeaders } from "@/lib/cache-policy";
import { createGameReport } from "@/lib/db-game-reports";
import { notifyAdminOfGameReport } from "@/lib/game-report-notification";
import { validateGameReportInput } from "@/lib/game-report-validation";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

const gameSessionCookie = "mini_game_session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return reportResponse({ error: "Geçersiz istek kaynağı." }, 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reportResponse({ error: "Geçersiz istek." }, 400);
  }

  const input = validateGameReportInput(body);
  if (!input) return reportResponse({ error: "Bildirim bilgileri eksik veya geçersiz." }, 400);

  const { sessionId, hasAuthCookie } = await getOrCreateGameSession();
  const rate = await consumeRateLimits([
    { action: "game-report-ip", subject: await getClientIp(), limit: 30, windowSeconds: 3600 },
    { action: "game-report-session", subject: sessionId, limit: 10, windowSeconds: 86400 },
  ]);
  if (!rate.allowed) return reportResponse({ error: "Çok fazla bildirim gönderdin. Lütfen daha sonra tekrar dene." }, 429, rate.retryAfterSeconds);

  const profile = hasAuthCookie ? await getCurrentProfile() : null;
  try {
    const result = await createGameReport({
      gameId: input.gameId,
      reporterProfileId: profile?.id ?? null,
      reporterSubjectHash: abuseSubject(`game-report:${sessionId}`),
      reason: input.reason,
      details: input.details,
    });
    if (result.created) {
      after(async () => {
        const notification = await notifyAdminOfGameReport({
          gameTitle: result.gameTitle,
          gameSlug: result.gameSlug,
          reason: input.reason,
          details: input.details,
        });
        if (!notification.ok) console.error("[game-report] notification failed", notification.reason);
      });
    }
    return reportResponse({ ok: true, alreadyReported: !result.created });
  } catch (error) {
    console.error("[game-report] create failed", error);
    return reportResponse({ error: "Bildirim şu anda gönderilemedi. Lütfen biraz sonra tekrar dene." }, 500);
  }
}

function reportResponse(value: unknown, status = 200, retryAfterSeconds?: number) {
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

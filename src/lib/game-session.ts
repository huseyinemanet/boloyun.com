import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const gameSessionCookie = "mini_game_session";

export async function getGameSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get(gameSessionCookie)?.value ?? null;
}

export async function getOrCreateGameSessionId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(gameSessionCookie)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  cookieStore.set(gameSessionCookie, sessionId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return sessionId;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

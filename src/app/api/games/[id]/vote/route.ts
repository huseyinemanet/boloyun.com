import { NextResponse } from "next/server";
import { consumeRateLimits, getClientIp } from "@/lib/abuse";
import { getPublicSettings } from "@/lib/db-settings";
import { upsertGameVote, type GameVote } from "@/lib/db-game-reactions";
import { getOrCreateGameSessionId, isUuid } from "@/lib/game-session";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid game id." }, { status: 400 });

  const settings = await getPublicSettings();
  if (!settings.games.likesEnabled || !settings.community.ratingsEnabled) {
    return NextResponse.json({ error: "Ratings are disabled." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null) as { vote?: unknown } | null;
  if (!isGameVote(payload?.vote)) return NextResponse.json({ error: "Invalid vote." }, { status: 400 });

  const sessionId = await getOrCreateGameSessionId();
  const rate = await consumeRateLimits([
    { action: "game-vote-session", subject: sessionId, limit: 20, windowSeconds: 3600 },
    { action: "game-vote-ip", subject: await getClientIp(), limit: 60, windowSeconds: 3600 },
  ]);
  if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const stats = await upsertGameVote(id, sessionId, payload.vote);
  return NextResponse.json({ vote: payload.vote, stats });
}

function isGameVote(value: unknown): value is GameVote {
  return value === "like" || value === "dislike";
}

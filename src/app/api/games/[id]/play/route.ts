import { NextResponse } from "next/server";
import { consumeRateLimits } from "@/lib/abuse";
import { getCurrentProfile } from "@/lib/auth";
import { recordGamePlay } from "@/lib/db-game-plays";
import { getOrCreateGameSessionId, isUuid } from "@/lib/game-session";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid game id." }, { status: 400 });

  const sessionId = await getOrCreateGameSessionId();
  const rate = await consumeRateLimits([{ action: "game-play-session", subject: sessionId, limit: 120, windowSeconds: 3600 }]);
  if (!rate.allowed) return NextResponse.json({ ok: true, limited: true });

  const profile = await getCurrentProfile();
  if (profile?.status === "blocked") return NextResponse.json({ error: "Account is blocked." }, { status: 403 });
  await recordGamePlay(id, sessionId, profile?.id);
  return NextResponse.json({ ok: true });
}

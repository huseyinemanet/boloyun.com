import { NextResponse } from "next/server";
import { cacheHeaders } from "@/lib/cache-policy";
import { getApprovedCommentsForGame, getTopCommentsForGame } from "@/lib/db-comments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gameId = new URL(request.url).searchParams.get("gameId") ?? "";
  if (!isUuid(gameId)) {
    return NextResponse.json({ latestComments: [], topComments: [] }, { headers: cacheHeaders("publicData") });
  }

  try {
    const [latestComments, topComments] = await Promise.all([
      getApprovedCommentsForGame(gameId),
      getTopCommentsForGame(gameId),
    ]);
    return NextResponse.json({ latestComments, topComments }, { headers: cacheHeaders("publicData") });
  } catch (error) {
    console.error("[comments] public API failed", error);
    return NextResponse.json(
      { error: "Yorumlar şu anda yüklenemiyor." },
      { status: 503, headers: cacheHeaders("noStore") },
    );
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

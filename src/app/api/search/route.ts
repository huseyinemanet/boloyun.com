import { NextResponse } from "next/server";
import { searchPublishedGameSuggestions } from "@/lib/db-games";
import { consumeRateLimits, getClientIp } from "@/lib/abuse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";

  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const rate = await consumeRateLimits([{ action: "search-ip", subject: await getClientIp(), limit: 90, windowSeconds: 60 }]);
  if (!rate.allowed) return NextResponse.json({ error: "Çok fazla arama yapıldı." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const items = await searchPublishedGameSuggestions(query, 6);

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

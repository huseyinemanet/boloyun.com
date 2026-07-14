import { NextResponse } from "next/server";
import { getPopularGameSuggestions, searchPublishedGameSuggestions } from "@/lib/db-games";
import { consumeRateLimits, getClientIp } from "@/lib/abuse";
import { cacheHeaders } from "@/lib/cache-policy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const popular = searchParams.get("popular") === "1";

  if (!popular && query.length < 2) {
    return NextResponse.json({ items: [] }, { headers: cacheHeaders("publicDataShort") });
  }

  const rate = await consumeRateLimits([{ action: "search-ip", subject: await getClientIp(), limit: 90, windowSeconds: 60 }]);
  if (!rate.allowed) return NextResponse.json({ error: "Çok fazla arama yapıldı." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const items = popular && query.length < 2
    ? await getPopularGameSuggestions(5)
    : await searchPublishedGameSuggestions(query, 6);

  return NextResponse.json(
    { items },
    { headers: cacheHeaders("publicDataShort") },
  );
}

import { NextResponse } from "next/server";
import { getPopularGameSuggestions, searchPublishedGameSuggestions } from "@/lib/games/public-queries";
import { abuseSubject, getClientIp } from "@/lib/abuse";
import { cacheHeaders } from "@/lib/cache-policy";
import { consumePublicReadLimit } from "@/lib/public-read-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const popular = searchParams.get("mode") === "popular";

  if (!popular && query.length < 3) {
    return NextResponse.json({ items: [] }, { headers: cacheHeaders("publicSearch") });
  }

  const rate = consumePublicReadLimit(abuseSubject(await getClientIp()));
  if (!rate.allowed) return NextResponse.json({ error: "Çok fazla arama yapıldı." }, { status: 429, headers: { ...cacheHeaders("noStore"), "Retry-After": String(rate.retryAfterSeconds) } });

  const items = popular
    ? await getPopularGameSuggestions(5)
    : await searchPublishedGameSuggestions(query, 6);

  const response = NextResponse.json(
    { items },
    { headers: cacheHeaders("publicSearch") },
  );
  return response;
}

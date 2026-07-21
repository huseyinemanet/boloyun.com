import { redirect } from "next/navigation";
import { getRandomPublishedGameSlug } from "@/lib/games/public-queries";

export async function GET(request: Request) {
  const excludeSlug = new URL(request.url).searchParams.get("exclude")?.trim() || undefined;
  const slug = await getRandomPublishedGameSlug(excludeSlug);
  const href = slug ? `/oyun/${slug}` : "/";

  if (request.headers.get("accept")?.includes("application/json")) {
    return Response.json(
      { href },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  redirect(href);
}

import { redirect } from "next/navigation";
import { getRandomPublishedGameSlug } from "@/lib/db-games";

export async function GET(request: Request) {
  const excludeSlug = new URL(request.url).searchParams.get("exclude")?.trim() || undefined;
  const slug = await getRandomPublishedGameSlug(excludeSlug);
  redirect(slug ? `/oyun/${slug}` : "/");
}

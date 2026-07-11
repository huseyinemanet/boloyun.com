import { redirect } from "next/navigation";
import { getRandomPublishedGameSlug } from "@/lib/db-games";

export async function GET() {
  const slug = await getRandomPublishedGameSlug();
  redirect(slug ? `/oyun/${slug}` : "/");
}

import { getPublishedGames } from "@public/lib/data";
import { SITE_URL } from "@public/lib/seo";

export const dynamic = "force-static";

export async function GET() {
  const games = await getPublishedGames(100);
  const body = [
    "# Bol Oyun",
    "",
    "Turkish-first browser mini game portal.",
    "",
    "## Important URLs",
    `- Home: ${SITE_URL}/`,
    `- Search: ${SITE_URL}/arama`,
    "",
    "## Sample Games",
    ...games.slice(0, 25).map((game) => `- ${game.title}: ${SITE_URL}/oyun/${game.slug}`),
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

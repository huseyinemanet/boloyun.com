export const revalidate = 3600;

const content = `# Bol Oyun

Bol Oyun is a Turkish-first browser game portal for discovering, searching and playing free mini games.

## Primary URLs

- Home: https://boloyun.com/
- Game pages: https://boloyun.com/oyun/[slug]
- Category pages: https://boloyun.com/kategori/[slug]
- Tag pages: https://boloyun.com/etiket/[slug]
- Search: https://boloyun.com/arama?q=[query]
- Sitemap: https://boloyun.com/sitemap.xml
- Robots: https://boloyun.com/robots.txt

## Content

Game titles may preserve original names and proper nouns. Public interface text, game descriptions, controls, how-to-play sections and SEO text are written for Turkish readers.

## Crawling Guidance

Use the sitemap for broad discovery. Prefer public game, category, tag and static content pages. Do not crawl admin, authentication, profile or API routes.

## Important Public Sections

- Yeni Oyunlar: latest published games
- Popüler Oyunlar: games ordered by play count
- Trend Oyunlar: currently highlighted or trending games
- Kategoriler: browsable game categories
- Oyun sayfaları: playable game pages with description, controls, tags and related games
`;

export async function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

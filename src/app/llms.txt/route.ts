export const revalidate = 3600;

const content = `# Bol Oyun

> Bol Oyun is a Turkish-first browser game portal for discovering, searching and playing free browser mini games.

Bol Oyun helps users find a game, open the game page, click "Oyunu Başlat", play in the browser and discover another game.

Public content is Turkish-first. Game titles may preserve original names and proper nouns. Game descriptions, controls, how-to-play sections and SEO text are intended for Turkish readers.

Use the sitemap for broad discovery. Prefer public game, category, tag and static content pages. Do not crawl admin, authentication, profile or API routes.

- Yeni Oyunlar: latest published games
- Popüler Oyunlar: games ordered by play count
- Trend Oyunlar: currently highlighted or trending games
- Kategoriler: browsable game categories
- Oyun sayfaları: playable game pages with description, controls, tags and related games

## Core

- [Home](https://boloyun.com/): Main discovery page with game sections, category sidebar and search.
- [Search](https://boloyun.com/arama): Public game search page.
- [Game pages](https://boloyun.com/oyun/[slug]): Public playable game detail pages. Replace [slug] with a game slug.
- [Category pages](https://boloyun.com/kategori/[slug]): Public category pages. Replace [slug] with a category slug.
- [Tag pages](https://boloyun.com/etiket/[slug]): Public tag pages. Replace [slug] with a tag slug.

## Discovery

- [Sitemap](https://boloyun.com/sitemap.xml): Sitemap index for crawlable public URLs.
- [Robots](https://boloyun.com/robots.txt): Crawling rules and sitemap location.

## Optional

- [Terms of Service](https://boloyun.com/sayfa/kullanim-sartlari): Site usage terms.
- [Privacy Policy](https://boloyun.com/sayfa/gizlilik-politikasi): Privacy and data handling information.
- [Contact](https://boloyun.com/sayfa/iletisim): Contact information.
`;

export async function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

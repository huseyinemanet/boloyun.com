import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = "supabase/migrations/20260730191711_optimize_public_game_page_temp_io.sql";

test("oyun sayfası uyumluluk RPC'si temp-disk üreten öneri kümelerini hesaplamaz", () => {
  const sql = readFileSync(path.join(process.cwd(), migrationPath), "utf8");

  assert.match(sql, /create or replace function public\.get_public_game_page\(p_slug text\)/);
  assert.match(sql, /public\.get_public_game_detail\(p_slug\)/);
  assert.match(sql, /'related_games', '\[\]'::jsonb/);
  assert.match(sql, /'latest_category_games', '\[\]'::jsonb/);
  assert.match(sql, /'popular_category_games', '\[\]'::jsonb/);
  assert.doesNotMatch(sql, /category_stats as materialized/);
  assert.doesNotMatch(sql, /tag_stats as materialized/);
  assert.doesNotMatch(sql, /signals as materialized/);
  assert.doesNotMatch(sql, /scores as materialized/);
  assert.match(sql, /revoke execute .* from public, anon, authenticated/);
  assert.match(sql, /grant execute .* to service_role/);
});

test("uygulama oyun detayını hafif RPC'den alır ve önerileri ayrı sorgularla kurar", () => {
  const queries = readFileSync(path.join(process.cwd(), "src/lib/games/public-queries.ts"), "utf8");
  const gamePageFlow = queries.slice(
    queries.indexOf("const getPublicGamePageBySlugCached"),
    queries.indexOf("export const getPublicGamePageBySlug"),
  );

  assert.match(gamePageFlow, /getPublishedGameDetailBySlug\(slug\)/);
  assert.match(gamePageFlow, /getRelatedPublishedGames\(detail\.game\.id, 25/);
  assert.match(gamePageFlow, /getCategoryRecommendationGames\(primaryCategory\.id, detail\.game\.id, "latest", 25\)/);
  assert.match(gamePageFlow, /getCategoryRecommendationGames\(primaryCategory\.id, detail\.game\.id, "popular", 25\)/);
  assert.doesNotMatch(gamePageFlow, /get_public_game_page/);
  assert.match(gamePageFlow, /public-game-page-snapshot-v4/);
});

test("oyun sayfası benzer oyunları erişilebilir karuselde gösterir", () => {
  const page = readFileSync(path.join(process.cwd(), "src/app/(public)/oyun/[slug]/page.tsx"), "utf8");
  const carousel = readFileSync(path.join(process.cwd(), "src/components/game/similar-games-carousel.tsx"), "utf8");

  assert.match(page, /<SimilarGamesCarousel/);
  assert.match(page, /similarGames\.map\(\(\{ id, title, slug, thumbnailUrl \}\)/);
  assert.match(carousel, /games\.slice\(0, 25\)/);
  assert.match(carousel, /lg:basis-1\/5/);
});

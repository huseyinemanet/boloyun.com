import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = "supabase/migrations/20260721170000_unify_game_popularity_signals.sql";

test("benzer oyun sorgusu tüm kategori ve etiket sinyallerini puanlar", () => {
  const sql = readFileSync(path.join(process.cwd(), migrationPath), "utf8");

  assert.match(sql, /category_stats as materialized/);
  assert.match(sql, /tag_stats as materialized/);
  assert.match(sql, /sum\(score\) taxonomy_score/);
  assert.match(sql, /score\.taxonomy_score desc/);
  assert.match(sql, /limit 25/);
});

test("oyun sayfası benzer oyunları erişilebilir karuselde gösterir", () => {
  const page = readFileSync(path.join(process.cwd(), "src/app/(public)/oyun/[slug]/page.tsx"), "utf8");
  const carousel = readFileSync(path.join(process.cwd(), "src/components/game/similar-games-carousel.tsx"), "utf8");

  assert.match(page, /<SimilarGamesCarousel/);
  assert.match(page, /similarGames\.map\(\(\{ id, title, slug, thumbnailUrl \}\)/);
  assert.match(carousel, /games\.slice\(0, 25\)/);
  assert.match(carousel, /lg:basis-1\/5/);
});

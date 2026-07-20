import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = "supabase/migrations/20260720160000_improve_related_game_recommendations.sql";

test("benzer oyun sorgusu tüm kategori ve etiket sinyallerini puanlar", () => {
  const sql = readFileSync(path.join(process.cwd(), migrationPath), "utf8");

  assert.match(sql, /selected_category_stats as materialized/);
  assert.match(sql, /selected_tag_stats as materialized/);
  assert.match(sql, /sum\(signal\.score\) as taxonomy_score/);
  assert.match(sql, /score\.taxonomy_score desc/);
  assert.match(sql, /limit 5/);
});

test("oyun sayfası benzer oyunları beşli masaüstü gridinde gösterir", () => {
  const page = readFileSync(path.join(process.cwd(), "src/app/(public)/oyun/[slug]/page.tsx"), "utf8");

  assert.match(page, /lg:grid-cols-5/);
  assert.match(page, /similarGames\.slice\(0, 5\)/);
});

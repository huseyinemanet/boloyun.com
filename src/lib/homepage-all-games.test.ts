import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const homepageSource = readFileSync(
  path.join(process.cwd(), "src/app/(public)/(home)/page.tsx"),
  "utf8",
);

test("ana sayfa Tüm Oyunlar bölümünde yayınlanmış oyun kartlarını gösterir", () => {
  assert.match(homepageSource, /export const dynamic = "force-dynamic"/);
  assert.match(homepageSource, /const HOME_ALL_GAMES_LIMIT = 20/);
  assert.match(homepageSource, /const allGames = \[[\s\S]*homepage\.latestGames/);
  assert.match(homepageSource, /allGames\.map\(\(game\) => <GameCard/);
  assert.match(homepageSource, /data-analytics-list-name="Tüm Oyunlar"/);
  assert.match(homepageSource, /href="\/oyunlar"/);
});

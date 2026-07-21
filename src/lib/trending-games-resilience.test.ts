import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const gamesSource = readFileSync(path.join(process.cwd(), "src/lib/games/public-queries.ts"), "utf8");

test("trend sorgusu üretimde hata verirse demo yerine gerçek popüler oyunlara düşer", () => {
  assert.match(gamesSource, /return getPopularPublishedGames\(safeLimit\)/);
  assert.match(gamesSource, /Trend oyunlar sorgusu başarısız/);
});

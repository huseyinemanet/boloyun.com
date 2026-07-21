import assert from "node:assert/strict";
import test from "node:test";
import { getIstanbulDayKey, rotateGamesForDay } from "./daily-game-rotation";

const games = Array.from({ length: 60 }, (_, index) => ({ id: `game-${index + 1}` }));

test("İstanbul gün sınırını rotasyon anahtarına dönüştürür", () => {
  assert.equal(getIstanbulDayKey(new Date("2026-07-20T20:59:59.000Z")), "2026-07-20");
  assert.equal(getIstanbulDayKey(new Date("2026-07-20T21:00:00.000Z")), "2026-07-21");
});

test("aynı gün ve bölüm için aynı oyun sırasını üretir", () => {
  const first = rotateGamesForDay(games, "2026-07-20", "latest").map((game) => game.id);
  const second = rotateGamesForDay(games, "2026-07-20", "latest").map((game) => game.id);
  assert.deepEqual(first, second);
});

test("ertesi gün görünen oyunları değiştirirken aday havuzunu korur", () => {
  const today = rotateGamesForDay(games, "2026-07-20", "trending");
  const tomorrow = rotateGamesForDay(games, "2026-07-21", "trending");
  assert.notDeepEqual(today.slice(0, 12), tomorrow.slice(0, 12));
  assert.deepEqual(today.map((game) => game.id).toSorted(), tomorrow.map((game) => game.id).toSorted());
});

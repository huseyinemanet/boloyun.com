import assert from "node:assert/strict";
import test from "node:test";
import { mapContinuePlayingRows, normalizeContinuePlayingLimit } from "./db-continue-playing";

test("continue playing limit stays inside the public card bounds", () => {
  assert.equal(normalizeContinuePlayingLimit(-4), 1);
  assert.equal(normalizeContinuePlayingLimit(6.8), 6);
  assert.equal(normalizeContinuePlayingLimit(30), 12);
  assert.equal(normalizeContinuePlayingLimit(Number.NaN), 6);
});

test("continue playing rows use normalized covers and a safe fallback", () => {
  const rows = mapContinuePlayingRows([
    { id: "game-1", title: "Birinci Oyun", slug: "birinci-oyun", thumbnail_url: "site-assets/cover/one.webp", last_played_at: "2026-07-21T10:00:00Z" },
    { id: "game-2", title: "İkinci Oyun", slug: "ikinci-oyun", thumbnail_url: null, last_played_at: "2026-07-20T10:00:00Z" },
  ]);

  assert.deepEqual(rows, [
    { id: "game-1", title: "Birinci Oyun", slug: "birinci-oyun", thumbnailUrl: "/site-assets/cover/one.webp" },
    { id: "game-2", title: "İkinci Oyun", slug: "ikinci-oyun", thumbnailUrl: "/thumbnails/puzzle.svg" },
  ]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { getRandomGameHref } from "@/lib/random-game";

test("uses the canonical random route outside a game page", () => {
  assert.equal(getRandomGameHref("/"), "/rastgele");
  assert.equal(getRandomGameHref("/kategori/aksiyon"), "/rastgele");
});

test("excludes the current game when requesting another random game", () => {
  assert.equal(
    getRandomGameHref("/oyun/ates-ve-su"),
    "/rastgele?exclude=ates-ve-su",
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("public oyun aksiyonları görünür Sonner bildirimleri üretir", () => {
  const gamePage = readSource("src/app/(public)/oyun/[slug]/page.tsx");
  const actions = readSource("src/app/(public)/oyun/[slug]/game-user-actions.tsx");
  const share = readSource("src/components/game/share-game-button.tsx");

  assert.match(gamePage, /<Toaster position="top-center" \/>/);
  assert.match(actions, /toast\.success\(/);
  assert.match(actions, /toast\.error\(/);
  assert.match(share, /toast\.success\(/);
  assert.match(share, /toast\.error\(/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { gameReactions, isGameReaction } from "./db-game-reactions";

test("game reactions expose the six supported choices in display order", () => {
  assert.deepEqual(gameReactions, ["like", "love", "haha", "wow", "sad", "angry"]);
});

test("isGameReaction rejects legacy and unknown vote values", () => {
  for (const reaction of gameReactions) assert.equal(isGameReaction(reaction), true);
  assert.equal(isGameReaction("dislike"), false);
  assert.equal(isGameReaction("care"), false);
  assert.equal(isGameReaction(null), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { mergePrebuildSlugs, PUBLIC_PREBUILD_LIMITS } from "./prebuild-policy";

test("public prebuild limits keep deploy-time rendering bounded", () => {
  assert.equal(PUBLIC_PREBUILD_LIMITS.games, 24);
  assert.equal(PUBLIC_PREBUILD_LIMITS.categories, 12);
  assert.ok(PUBLIC_PREBUILD_LIMITS.popularGames + PUBLIC_PREBUILD_LIMITS.latestGames >= PUBLIC_PREBUILD_LIMITS.games);
});

test("mergePrebuildSlugs deduplicates and stops at the requested limit", () => {
  const result = mergePrebuildSlugs([
    [{ slug: "popular-1" }, { slug: "shared" }, { slug: "popular-2" }],
    [{ slug: "shared" }, { slug: "latest-1" }, { slug: "latest-2" }],
  ], 4);

  assert.deepEqual(result, [
    { slug: "popular-1" },
    { slug: "shared" },
    { slug: "popular-2" },
    { slug: "latest-1" },
  ]);
});

test("mergePrebuildSlugs ignores invalid values", () => {
  assert.deepEqual(mergePrebuildSlugs([[{ slug: null }, { slug: "" }, { slug: "oyun" }]], 10), [{ slug: "oyun" }]);
  assert.deepEqual(mergePrebuildSlugs([[{ slug: "oyun" }]], 0), []);
});

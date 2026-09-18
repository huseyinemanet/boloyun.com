import assert from "node:assert/strict";
import test from "node:test";
import { boundedInteger, catalogPagination, normalizeSearchQuery } from "./catalog-policy";

test("catalogue requests reject non-finite sizes and cap large pages", () => {
  assert.deepEqual(catalogPagination(Infinity, NaN), { page: 1, perPage: 24 });
  assert.deepEqual(catalogPagination(1e9, 10000), { page: 2000, perPage: 48 });
  assert.deepEqual(catalogPagination(-1, -10), { page: 1, perPage: 1 });
  assert.equal(boundedInteger(3.9, 24, 48), 3);
  assert.equal(catalogPagination(2, 40, 24).perPage, 24);
});

test("equivalent Turkish searches use the same bounded cache key", () => {
  assert.equal(normalizeSearchQuery("  İKİ   KİŞİLİK  "), "İKİ KİŞİLİK");
  assert.equal(normalizeSearchQuery("MARIO"), "MARIO");
  assert.equal(normalizeSearchQuery(" "), "");
  assert.equal(normalizeSearchQuery("a".repeat(10000)).length, 80);
});

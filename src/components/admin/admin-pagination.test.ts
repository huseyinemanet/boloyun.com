import assert from "node:assert/strict";
import test from "node:test";
import { getAdminPaginationPages } from "./admin-pagination";

test("ilk sayfada ilk beş sayfayı ve son sayfayı gösterir", () => {
  assert.deepEqual(getAdminPaginationPages(1, 533, 5), [1, 2, 3, 4, 5, "ellipsis", 533]);
});

test("orta sayfalarda aktif sayfanın çevresindeki beş sayfayı gösterir", () => {
  assert.deepEqual(getAdminPaginationPages(20, 533, 5), [1, "ellipsis", 18, 19, 20, 21, 22, "ellipsis", 533]);
});

test("son sayfada son beş sayfayı gösterir", () => {
  assert.deepEqual(getAdminPaginationPages(533, 533, 5), [1, "ellipsis", 529, 530, 531, 532, 533]);
});

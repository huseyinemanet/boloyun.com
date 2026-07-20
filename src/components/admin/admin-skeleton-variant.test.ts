import assert from "node:assert/strict";
import test from "node:test";
import { getAdminSkeletonVariant } from "./admin-skeleton-variant";

test("admin menüsündeki her sayfayı gerçek yerleşimine uygun skeleton grubuna yönlendirir", () => {
  assert.deepEqual(
    [
      "/admin",
      "/admin/games",
      "/admin/crawler",
      "/admin/imports",
      "/admin/categories",
      "/admin/tags",
      "/admin/static-pages",
      "/admin/comments",
      "/admin/users",
      "/admin/ads",
      "/admin/ai",
      "/admin/settings/general",
    ].map(getAdminSkeletonVariant),
    ["overview", "table", "crawler", "imports", "management", "management", "table", "table", "table", "ads", "ai", "settings"],
  );
});

test("alt düzenleme sayfaları üst menü sayfasının skeleton grubunu korur", () => {
  assert.equal(getAdminSkeletonVariant("/admin/imports/example-id"), "imports");
  assert.equal(getAdminSkeletonVariant("/admin/users/example-id/edit"), "table");
  assert.equal(getAdminSkeletonVariant("/admin/settings/security"), "settings");
});

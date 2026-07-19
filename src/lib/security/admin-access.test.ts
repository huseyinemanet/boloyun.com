import assert from "node:assert/strict";
import test from "node:test";
import { isActiveAdminProfile } from "./admin-access";

test("yalnız aktif admin korumalı admin render'ına geçebilir", () => {
  assert.equal(isActiveAdminProfile(null), false, "anonim kullanıcı reddedilmeli");
  assert.equal(isActiveAdminProfile({ role: "member", status: "active" }), false, "member reddedilmeli");
  assert.equal(isActiveAdminProfile({ role: "admin", status: "blocked" }), false, "blocked admin reddedilmeli");
  assert.equal(isActiveAdminProfile({ role: "admin", status: "active" }), true, "aktif admin kabul edilmeli");
});

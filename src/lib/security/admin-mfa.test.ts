import assert from "node:assert/strict";
import test from "node:test";
import { adminMfaPath, isAdminMfaSatisfied } from "./admin-mfa";

test("admin erişimi yalnız aal2 oturumuna izin verir", () => {
  assert.equal(isAdminMfaSatisfied("aal2"), true);
  assert.equal(isAdminMfaSatisfied("aal1"), false);
  assert.equal(isAdminMfaSatisfied(null), false);
});

test("MFA yönlendirmesi hedefi güvenli biçimde kodlar", () => {
  assert.equal(adminMfaPath("/admin/users?status=active"), "/hesap-guvenligi?next=%2Fadmin%2Fusers%3Fstatus%3Dactive");
});

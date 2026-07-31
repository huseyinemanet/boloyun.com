import assert from "node:assert/strict";
import test from "node:test";
import { AUTH_PASSWORD_MIN_LENGTH, meetsAuthPasswordMinimum } from "./auth-password-policy";

test("kayıt parolası sunucuda en az on iki karakter olmalıdır", () => {
  assert.equal(AUTH_PASSWORD_MIN_LENGTH, 12);
  assert.equal(meetsAuthPasswordMinimum("12345678901"), false);
  assert.equal(meetsAuthPasswordMinimum("123456789012"), true);
});

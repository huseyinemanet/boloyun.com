import assert from "node:assert/strict";
import test from "node:test";
import { AUTH_PASSWORD_MIN_LENGTH, meetsAuthPasswordMinimum } from "./auth-password-policy";

test("kayıt parolası sunucuda en az sekiz karakter olmalıdır", () => {
  assert.equal(AUTH_PASSWORD_MIN_LENGTH, 8);
  assert.equal(meetsAuthPasswordMinimum("1234567"), false);
  assert.equal(meetsAuthPasswordMinimum("12345678"), true);
});

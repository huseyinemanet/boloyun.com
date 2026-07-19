import assert from "node:assert/strict";
import test from "node:test";
import {
  createPasswordRecoveryCookieValue,
  createPasswordRecoveryIntent,
  hasValidPasswordRecoveryCookie,
  hasValidPasswordRecoveryIntent,
} from "./auth-recovery";

test("recovery cookie kullanıcıya ve kısa süreye bağlıdır", () => {
  const previousSecret = process.env.ABUSE_HASH_SECRET;
  process.env.ABUSE_HASH_SECRET = "test-only-recovery-secret-with-enough-entropy";
  const now = Date.UTC(2026, 6, 19, 10, 0, 0);

  try {
    const value = createPasswordRecoveryCookieValue("user-a", now);
    assert.equal(hasValidPasswordRecoveryCookie(value, "user-a", now), true);
    assert.equal(hasValidPasswordRecoveryCookie(value, "user-b", now), false);
    assert.equal(hasValidPasswordRecoveryCookie(value, "user-a", now + 16 * 60 * 1000), false);
    assert.equal(hasValidPasswordRecoveryCookie("1.fake", "user-a", now), false);
    assert.equal(hasValidPasswordRecoveryCookie("1", "user-a", now), false);
  } finally {
    if (previousSecret === undefined) Reflect.deleteProperty(process.env, "ABUSE_HASH_SECRET");
    else process.env.ABUSE_HASH_SECRET = previousSecret;
  }
});

test("recovery callback yalnız imzalı ve e-postaya bağlı intent kabul eder", () => {
  const previousSecret = process.env.ABUSE_HASH_SECRET;
  process.env.ABUSE_HASH_SECRET = "test-only-recovery-secret-with-enough-entropy";
  const now = Date.UTC(2026, 6, 19, 10, 0, 0);

  try {
    const intent = createPasswordRecoveryIntent("USER@example.com", now);
    assert.equal(hasValidPasswordRecoveryIntent(intent, "user@example.com", now), true);
    assert.equal(hasValidPasswordRecoveryIntent(intent, "other@example.com", now), false);
    assert.equal(hasValidPasswordRecoveryIntent(intent, "user@example.com", now + 61 * 60 * 1000), false);
    assert.equal(hasValidPasswordRecoveryIntent("1.fake", "user@example.com", now), false);
  } finally {
    if (previousSecret === undefined) Reflect.deleteProperty(process.env, "ABUSE_HASH_SECRET");
    else process.env.ABUSE_HASH_SECRET = previousSecret;
  }
});

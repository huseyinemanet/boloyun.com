import assert from "node:assert/strict";
import test from "node:test";
import { apiKeyFingerprint, decryptApiKey, encryptApiKey, fingerprintsEqual, maskFingerprint } from "./crypto";

test("AI API key şifrelenip geri çözülebilir", () => {
  process.env.AI_SETTINGS_ENCRYPTION_KEY = "test-secret-with-enough-length";
  const encrypted = encryptApiKey("sk-test-value");
  assert.notEqual(encrypted.includes("sk-test-value"), true);
  assert.equal(decryptApiKey(encrypted), "sk-test-value");
});

test("API key fingerprint maskelenir ve sabit karşılaştırılır", () => {
  const fingerprint = apiKeyFingerprint("sk-test-value");
  assert.equal(fingerprintsEqual(fingerprint, fingerprint), true);
  assert.match(maskFingerprint(fingerprint), /^sha256:/);
});

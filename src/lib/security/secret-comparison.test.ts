import assert from "node:assert/strict";
import test from "node:test";
import { hasValidBearerSecret } from "./secret-comparison";

test("cron bearer secret tam ve sabit zamanlı digest ile doğrulanır", () => {
  assert.equal(hasValidBearerSecret("Bearer correct-secret", "correct-secret"), true);
  assert.equal(hasValidBearerSecret("Bearer wrong-secret", "correct-secret"), false);
  assert.equal(hasValidBearerSecret("Basic correct-secret", "correct-secret"), false);
  assert.equal(hasValidBearerSecret(null, "correct-secret"), false);
  assert.equal(hasValidBearerSecret("Bearer correct-secret", undefined), false);
});

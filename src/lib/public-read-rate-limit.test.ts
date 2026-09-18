import assert from "node:assert/strict";
import test from "node:test";
import { createPublicReadLimiter } from "./public-read-rate-limit";

test("public read limit blocks excess calls and recovers at expiry", () => {
  const consume = createPublicReadLimiter();
  assert.equal(consume("a", 2, 60000, 0).allowed, true);
  assert.equal(consume("a", 2, 60000, 1).allowed, true);
  assert.deepEqual(consume("a", 2, 60000, 30000), { allowed: false, retryAfterSeconds: 30 });
  assert.equal(consume("b", 2, 60000, 30000).allowed, true);
  assert.equal(consume("a", 2, 60000, 60000).allowed, true);
});

test("an IP flood cannot evict an active bucket or grow memory without bound", () => {
  const consume = createPublicReadLimiter(2);
  consume("a", 1, 60000, 0);
  consume("b", 1, 60000, 0);
  assert.equal(consume("c", 1, 60000, 1).allowed, false);
  assert.equal(consume("a", 1, 60000, 2).allowed, false);
  assert.equal(consume("c", 1, 60000, 60000).allowed, true);
});

import assert from "node:assert/strict";
import test from "node:test";
import { getTrustedClientIpFromHeaders } from "./client-ip";

test("production yalnız Nginx X-Real-IP başlığına güvenir", () => {
  const headers = new Headers({
    "cf-connecting-ip": "203.0.113.10",
    "x-forwarded-for": "203.0.113.11",
    "x-real-ip": "198.51.100.20",
  });

  assert.equal(getTrustedClientIpFromHeaders(headers, true), "198.51.100.20");
  assert.equal(getTrustedClientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.11" }), true), "unknown");
  assert.equal(getTrustedClientIpFromHeaders(new Headers({ "cf-connecting-ip": "203.0.113.10" }), true), "unknown");
});

test("geçersiz X-Real-IP reddedilir", () => {
  assert.equal(getTrustedClientIpFromHeaders(new Headers({ "x-real-ip": "attacker" }), true), "unknown");
});

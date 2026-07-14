import assert from "node:assert/strict";
import test from "node:test";
import { cacheControl, cacheHeaders, isPrivateCacheControl, mergeCacheHeaders } from "./cache-policy";

test("cacheControl returns the shared policy value", () => {
  assert.equal(cacheControl("immutableAsset"), "public, max-age=31536000, immutable");
  assert.equal(cacheControl("privateNoStore"), "private, no-store");
});

test("cacheHeaders creates a Cache-Control header object", () => {
  assert.deepEqual(cacheHeaders("publicDataShort"), {
    "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  });
});

test("mergeCacheHeaders preserves existing headers and replaces Cache-Control", () => {
  const headers = mergeCacheHeaders("publicAsset", { "Content-Type": "text/plain", "Cache-Control": "no-store" });
  assert.equal(headers.get("content-type"), "text/plain");
  assert.equal(headers.get("cache-control"), "public, max-age=86400, stale-while-revalidate=604800");
});

test("isPrivateCacheControl detects private and no-store policies", () => {
  assert.equal(isPrivateCacheControl("private, no-store"), true);
  assert.equal(isPrivateCacheControl("public, s-maxage=60"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { decodeKeysetCursor, encodeKeysetCursor, keysetFilter, parseKeysetDirection } from "./keyset-pagination";

const cursor = { updatedAt: "2026-07-11T12:00:00.000Z", id: "123e4567-e89b-42d3-a456-426614174000" };

test("cursor round-trips through a URL-safe value", () => {
  assert.deepEqual(decodeKeysetCursor(encodeKeysetCursor(cursor)), cursor);
});

test("invalid cursor input is rejected", () => {
  assert.equal(decodeKeysetCursor("not-a-cursor"), null);
  assert.equal(decodeKeysetCursor(encodeKeysetCursor({ ...cursor, id: "bad" })), null);
});

test("direction and database filters use matching keyset operators", () => {
  assert.equal(parseKeysetDirection("previous"), "previous");
  assert.equal(parseKeysetDirection("unknown"), "next");
  assert.match(keysetFilter(cursor, "next"), /updated_at\.lt\./);
  assert.match(keysetFilter(cursor, "previous"), /updated_at\.gt\./);
});

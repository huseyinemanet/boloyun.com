import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatFullDateTime, formatRelativeDateTime } from "./date-time";

describe("admin activity date formatting", () => {
  const now = new Date("2026-07-16T12:00:00.000Z");

  it("uses relative Turkish dates", () => {
    assert.equal(formatRelativeDateTime("2026-07-16T11:55:00.000Z", now), "5 dakika önce");
    assert.equal(formatRelativeDateTime("2026-07-15T12:00:00.000Z", now), "dün");
  });

  it("keeps the full Istanbul date for the title", () => {
    assert.equal(formatFullDateTime("2026-07-15T15:31:00.000Z"), "15 Temmuz 2026 18:31");
  });
});

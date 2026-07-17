import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAdminImportFilter, statusesForAdminImportFilter } from "./game-imports";

describe("admin import filters", () => {
  it("falls back to the review queue", () => {
    assert.equal(parseAdminImportFilter(undefined), "review");
    assert.equal(parseAdminImportFilter("unknown"), "review");
  });

  it("maps review and archive filters to explicit statuses", () => {
    assert.deepEqual(statusesForAdminImportFilter("review"), ["scraped", "ai_generated", "pending_review"]);
    assert.deepEqual(statusesForAdminImportFilter("approved"), ["approved"]);
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import { validateGameReportInput } from "./game-report-validation";

const gameId = "123e4567-e89b-42d3-a456-426614174000";

test("accepts a valid game report and normalizes optional details", () => {
  assert.deepEqual(validateGameReportInput({ gameId, reason: "not_loading", details: "  Siyah ekran kalıyor.  " }), {
    gameId,
    reason: "not_loading",
    details: "Siyah ekran kalıyor.",
  });
});

test("rejects invalid ids, reasons and oversized details", () => {
  assert.equal(validateGameReportInput({ gameId: "bad", reason: "broken" }), null);
  assert.equal(validateGameReportInput({ gameId, reason: "spam" }), null);
  assert.equal(validateGameReportInput({ gameId, reason: "other", details: "x".repeat(501) }), null);
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseImportIntent, parseImportUrl, requiredImportReason } from "./import-validation";

describe("admin import validation", () => {
  it("accepts supported intents and rejects unknown values", () => {
    assert.equal(parseImportIntent("approve"), "approve");
    assert.equal(parseImportIntent(null), "save");
    assert.throws(() => parseImportIntent("publish"), /Geçersiz import işlemi/);
  });

  it("requires a meaningful moderation reason", () => {
    assert.equal(requiredImportReason("  Kaynak çalışmıyor  "), "Kaynak çalışmıyor");
    assert.throws(() => requiredImportReason("x"), /en az 3 karakterlik/);
  });

  it("accepts only HTTP URLs", () => {
    assert.equal(parseImportUrl("https://example.com/game", "Kaynak"), "https://example.com/game");
    assert.equal(parseImportUrl("", "Kaynak", true), null);
    assert.throws(() => parseImportUrl("javascript:alert(1)", "Kaynak"), /HTTP\(S\)/);
  });
});

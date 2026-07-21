import assert from "node:assert/strict";
import test from "node:test";
import { configureAnalytics, gameAnalyticsItem, sanitizeAnalyticsParams, sanitizeText, trackAnalyticsEvent } from "./analytics";

test("analytics text removes likely personal data and limits length", () => {
  assert.equal(sanitizeText("  ara test@example.com veya +90 555 111 22 33  "), "ara [redacted] veya [redacted]");
  assert.equal(sanitizeText("x".repeat(120)).length, 100);
});

test("analytics params omit empty values and cap item arrays", () => {
  const items = Array.from({ length: 25 }, (_, index) => gameAnalyticsItem({ id: String(index), title: `Oyun ${index}` }));
  const result = sanitizeAnalyticsParams({ search_term: " yarış ", empty: null, items });
  assert.equal(result.search_term, "yarış");
  assert.equal("empty" in result, false);
  assert.equal((result.items as unknown[]).length, 20);
});

test("game item uses GA4 item field names", () => {
  assert.deepEqual(gameAnalyticsItem({ id: "game-1", title: "Yarış Oyunu" }, { item_list_name: "Popüler Oyunlar", index: 2 }), {
    item_id: "game-1",
    item_name: "Yarış Oyunu",
    item_list_name: "Popüler Oyunlar",
    index: 2,
  });
});

test("events are blocked without consent and sent to dataLayer after consent", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const dataLayer: unknown[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dataLayer, dispatchEvent: () => true },
  });
  try {
    configureAnalytics({ allowed: false, googleAnalytics: false, googleTagManager: true });
    assert.equal(trackAnalyticsEvent("game_start", { game_type: "iframe" }), false);
    assert.equal(dataLayer.length, 0);

    configureAnalytics({ allowed: true, googleAnalytics: false, googleTagManager: true });
    assert.equal(trackAnalyticsEvent("game_start", { game_type: "iframe" }), true);
    assert.deepEqual(dataLayer, [{ event: "game_start", game_type: "iframe" }]);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

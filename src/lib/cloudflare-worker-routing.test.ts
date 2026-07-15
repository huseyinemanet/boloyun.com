import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("oyun sayfaları ve RSC geçişleri yalnız OpenNext tarafından işlenir", async () => {
  const source = await readFile(new URL("../../cloudflare-worker.js", import.meta.url), "utf8");

  assert.doesNotMatch(source, /handleEdgeGamePage/);
  assert.doesNotMatch(source, /url\.pathname\.startsWith\("\/oyun\/"\)/);
  assert.doesNotMatch(source, /x-edge-fallback["']?\s*:\s*["']game-detail/);
});

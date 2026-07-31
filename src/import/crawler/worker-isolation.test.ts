import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("web route crawler işini çalıştırmak yerine kalıcı kuyruğa ekler", async () => {
  const route = await readFile(new URL("../../app/admin/crawler/run/route.ts", import.meta.url), "utf8");
  assert.match(route, /enqueueCrawlerJob/);
  assert.match(route, /status:\s*202/);
  assert.match(route, /requestBackgroundWorkerWake\(\)\.catch/);
  assert.doesNotMatch(route, /scrapeGame|generateGameContent|discoverGameUrls/);
});

test("crawler ve AI worker yalnız worker rolünde başlar", async () => {
  const [worker, compose, migration, wakeRoute] = await Promise.all([
    readFile(new URL("../../lib/ai/automation-worker.ts", import.meta.url), "utf8"),
    readFile(new URL("../../../deploy/compose.yml", import.meta.url), "utf8"),
    readFile(new URL("../../../supabase/migrations/20260720200000_crawler_worker_queue.sql", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/internal/worker/wake/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(worker, /BOL_OYUN_PROCESS_ROLE !== "worker"/);
  assert.match(worker, /runCrawlerQueueTick/);
  assert.match(compose, /BOL_OYUN_PROCESS_ROLE:\s*web/);
  assert.match(compose, /BOL_OYUN_PROCESS_ROLE:\s*worker/);
  assert.match(compose, /BACKGROUND_WORKER_ENABLED:\s*"false"/);
  assert.match(compose, /BACKGROUND_WORKER_MAX_IDLE_INTERVAL_MS:\s*"300000"/);
  assert.match(wakeRoute, /INTERNAL_HEALTH_CHECK_TOKEN/);
  assert.match(wakeRoute, /BOL_OYUN_PROCESS_ROLE !== "worker"/);
  assert.match(migration, /for update skip locked/i);
});

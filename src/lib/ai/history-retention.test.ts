import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../../supabase/migrations/20260731192343_optimize_ai_history_retention.sql", import.meta.url);

test("AI geçmiş retention migrationı oyun kayıtlarını silmeden snapshot payloadlarını temizler", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /add column if not exists snapshots_purged_at timestamptz/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /greatest\(90,/i);
  assert.match(sql, /before_snapshot = '\{\}'::jsonb/i);
  assert.match(sql, /output_snapshot = '\{\}'::jsonb/i);
  assert.match(sql, /delete from public\.ai_translation_automation_runs/i);
  assert.match(sql, /revoke all on function public\.purge_expired_ai_translation_history[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.purge_expired_ai_translation_history[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /(?:delete\s+from|truncate(?:\s+table)?)\s+public\.(?:games|game_categories|game_tags)\b/i);
  assert.doesNotMatch(sql, /update\s+public\.games\b/i);
});

test("worker retention işini yalnız günlük ve sınırlı batchlerle çağırır", async () => {
  const [maintenance, worker] = await Promise.all([
    readFile(new URL("./history-maintenance.ts", import.meta.url), "utf8"),
    readFile(new URL("../ai/automation-worker.ts", import.meta.url), "utf8"),
  ]);
  assert.match(maintenance, /RETENTION_DAYS = 90/);
  assert.match(maintenance, /BATCH_SIZE = 500/);
  assert.match(maintenance, /MAX_BATCHES_PER_DAY = 10/);
  assert.match(maintenance, /options\.shouldStop\?\.\(\)/);
  assert.match(worker, /state\.lastMaintenanceDay !== maintenanceDay/);
  assert.match(worker, /if \(!hasWork\)/);
  assert.match(worker, /shouldStop: \(\) => state\.wakePending/);
});

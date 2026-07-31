import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/client";

const RETENTION_DAYS = 90;
const BATCH_SIZE = 500;
const MAX_BATCHES_PER_DAY = 10;

type PurgeResult = {
  items_purged?: unknown;
  runs_deleted?: unknown;
};

export async function runAiHistoryMaintenanceTick(options: { shouldStop?: () => boolean } = {}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("AI geçmiş bakımı için Supabase service client gerekli.");

  let itemsPurged = 0;
  let runsDeleted = 0;
  let batches = 0;
  for (; batches < MAX_BATCHES_PER_DAY; batches += 1) {
    if (options.shouldStop?.()) break;
    const { data, error } = await supabase.rpc("purge_expired_ai_translation_history", {
      p_batch_size: BATCH_SIZE,
      p_retention_days: RETENTION_DAYS,
    });
    if (error) throw new Error(`AI geçmiş bakımı çalıştırılamadı: ${error.message}`);

    const result = data && typeof data === "object" && !Array.isArray(data) ? data as PurgeResult : {};
    const batchItems = safeCount(result.items_purged);
    const batchRuns = safeCount(result.runs_deleted);
    itemsPurged += batchItems;
    runsDeleted += batchRuns;
    if (options.shouldStop?.()) {
      batches += 1;
      break;
    }
    if (batchItems < BATCH_SIZE && batchRuns < BATCH_SIZE) {
      batches += 1;
      break;
    }
  }

  return { itemsPurged, runsDeleted, batches };
}

export function getIstanbulMaintenanceDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function safeCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

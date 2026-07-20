import "server-only";

import { randomUUID } from "node:crypto";
import { getBackgroundWorkerState } from "@/lib/background-worker-state";

const DEFAULT_ACTIVE_INTERVAL_MS = 2_000;
const DEFAULT_IDLE_INTERVAL_MS = 15_000;
const DEFAULT_AI_LIMIT = 5;
const DEFAULT_CRAWLER_BATCH_SIZE = 2;
const MIN_INTERVAL_MS = 1_000;
const MAX_ACTIVE_INTERVAL_MS = 120_000;
const MIN_IDLE_INTERVAL_MS = 5_000;
const MAX_IDLE_INTERVAL_MS = 1_800_000;

export function startBackgroundWorker() {
  if (!shouldStartWorker()) return;

  const state = getBackgroundWorkerState();
  if (state.started) return;
  state.started = true;
  state.workerId = `${process.env.HOSTNAME || "boloyun-worker"}-${randomUUID()}`;

  const activeIntervalMs = readIntegerEnv("BACKGROUND_WORKER_ACTIVE_INTERVAL_MS", readIntegerEnv("AI_AUTOMATION_WORKER_INTERVAL_MS", DEFAULT_ACTIVE_INTERVAL_MS, MIN_INTERVAL_MS, MAX_ACTIVE_INTERVAL_MS), MIN_INTERVAL_MS, MAX_ACTIVE_INTERVAL_MS);
  const idleIntervalMs = readIntegerEnv("BACKGROUND_WORKER_IDLE_INTERVAL_MS", readIntegerEnv("AI_AUTOMATION_WORKER_IDLE_INTERVAL_MS", DEFAULT_IDLE_INTERVAL_MS, MIN_IDLE_INTERVAL_MS, MAX_IDLE_INTERVAL_MS), MIN_IDLE_INTERVAL_MS, MAX_IDLE_INTERVAL_MS);
  const aiLimit = readIntegerEnv("BACKGROUND_WORKER_AI_LIMIT", readIntegerEnv("AI_AUTOMATION_WORKER_LIMIT", DEFAULT_AI_LIMIT, 1, 25), 1, 25);
  const crawlerBatchSize = readIntegerEnv("BACKGROUND_WORKER_CRAWLER_BATCH_SIZE", DEFAULT_CRAWLER_BATCH_SIZE, 1, 10);
  const aiWorkerEnabled = !["false", "0", "off"].includes(process.env.AI_AUTOMATION_WORKER_ENABLED?.toLowerCase() ?? "true");

  const schedule = (delayMs: number) => {
    state.timer = setTimeout(tick, delayMs);
    state.timer.unref?.();
  };

  const tick = async () => {
    if (state.running) {
      schedule(activeIntervalMs);
      return;
    }
    state.running = true;
    state.lastTickStartedAt = new Date().toISOString();
    let nextDelayMs = idleIntervalMs;
    try {
      const [{ runCrawlerQueueTick }, { runTranslationAutomationTick }] = await Promise.all([
        import("@/import/crawler/worker"),
        import("./db-ai"),
      ]);
      const crawler = await runCrawlerQueueTick(state.workerId ?? "boloyun-worker", { batchSize: crawlerBatchSize });
      const ai = aiWorkerEnabled
        ? await runTranslationAutomationTick("worker", { limit: aiLimit })
        : { status: "skipped" as const, message: "AI worker kapalı." };
      if (crawler.status !== "idle" || ai.status === "completed") nextDelayMs = activeIntervalMs;
      if (ai.status === "error") throw new Error(ai.message);
      state.consecutiveFailures = 0;
      state.lastError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.consecutiveFailures += 1;
      state.lastError = message;
      console.error("[background-worker] tick.failed", { error: message, failures: state.consecutiveFailures });
    } finally {
      state.running = false;
      state.lastTickFinishedAt = new Date().toISOString();
      schedule(nextDelayMs);
    }
  };

  schedule(3_000);
  console.log("[background-worker] started", { activeIntervalMs, idleIntervalMs, aiLimit, aiWorkerEnabled, crawlerBatchSize, workerId: state.workerId });
}

function shouldStartWorker() {
  if (process.env.BOL_OYUN_PROCESS_ROLE !== "worker") return false;
  const configured = process.env.BACKGROUND_WORKER_ENABLED?.toLowerCase();
  if (configured === "false" || configured === "0" || configured === "off") return false;
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  if (process.env.NODE_ENV !== "production" && configured !== "true") return false;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  return true;
}

function readIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

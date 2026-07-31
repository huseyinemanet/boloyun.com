import "server-only";

import { randomUUID } from "node:crypto";
import { getBackgroundWorkerState } from "@/lib/background-worker-state";
import { nextFailureDelay, nextSuccessfulTickSchedule, type BackgroundWorkerIntervals } from "@/lib/background-worker-schedule";

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
  const idleBackoffIntervalMs = readIntegerEnv("BACKGROUND_WORKER_IDLE_BACKOFF_INTERVAL_MS", 60_000, idleIntervalMs, MAX_IDLE_INTERVAL_MS);
  const maxIdleIntervalMs = readIntegerEnv("BACKGROUND_WORKER_MAX_IDLE_INTERVAL_MS", 300_000, idleBackoffIntervalMs, MAX_IDLE_INTERVAL_MS);
  const aiLimit = readIntegerEnv("BACKGROUND_WORKER_AI_LIMIT", readIntegerEnv("AI_AUTOMATION_WORKER_LIMIT", DEFAULT_AI_LIMIT, 1, 25), 1, 25);
  const crawlerBatchSize = readIntegerEnv("BACKGROUND_WORKER_CRAWLER_BATCH_SIZE", DEFAULT_CRAWLER_BATCH_SIZE, 1, 10);
  const aiWorkerEnabled = !["false", "0", "off"].includes(process.env.AI_AUTOMATION_WORKER_ENABLED?.toLowerCase() ?? "true");
  const intervals: BackgroundWorkerIntervals = {
    activeMs: activeIntervalMs,
    firstIdleMs: idleIntervalMs,
    backedOffIdleMs: idleBackoffIntervalMs,
    maxIdleMs: maxIdleIntervalMs,
  };

  const schedule = (delayMs: number) => {
    if (state.timer) clearTimeout(state.timer);
    state.nextTickAt = new Date(Date.now() + delayMs).toISOString();
    state.timer = setTimeout(() => {
      state.timer = null;
      state.nextTickAt = null;
      void tick();
    }, delayMs);
    state.timer.unref?.();
  };
  state.schedule = schedule;

  const tick = async () => {
    if (state.running) {
      state.wakePending = true;
      return;
    }
    state.running = true;
    state.lastTickStartedAt = new Date().toISOString();
    let nextDelayMs = intervals.firstIdleMs;
    try {
      const [{ runCrawlerQueueTick }, { runTranslationAutomationTick }] = await Promise.all([
        import("@/import/crawler/worker"),
        import("./db-ai"),
      ]);
      const crawler = await runCrawlerQueueTick(state.workerId ?? "boloyun-worker", { batchSize: crawlerBatchSize });
      const ai = aiWorkerEnabled
        ? await runTranslationAutomationTick("worker", { limit: aiLimit })
        : { status: "skipped" as const, message: "AI worker kapalı." };
      if (ai.status === "error") throw new Error(ai.message);
      const aiBusy = ai.status === "completed" || ("automation" in ai && ai.automation.status === "running");
      const hasWork = crawler.status !== "idle" || aiBusy;
      if (!hasWork) {
        const [{ getIstanbulMaintenanceDay, runAiHistoryMaintenanceTick }] = await Promise.all([
          import("./history-maintenance"),
        ]);
        const maintenanceDay = getIstanbulMaintenanceDay();
        if (state.lastMaintenanceDay !== maintenanceDay) {
          const maintenance = await runAiHistoryMaintenanceTick({ shouldStop: () => state.wakePending });
          state.lastMaintenanceDay = maintenanceDay;
          console.log("[background-worker] ai-history-maintenance.done", maintenance);
        }
      }
      const next = nextSuccessfulTickSchedule({ hasWork, idleStreak: state.idleStreak, wakePending: state.wakePending, intervals });
      state.idleStreak = next.idleStreak;
      nextDelayMs = next.delayMs;
      state.wakePending = false;
      state.consecutiveFailures = 0;
      state.lastError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.consecutiveFailures += 1;
      state.lastError = message;
      nextDelayMs = nextFailureDelay(state.consecutiveFailures, intervals);
      console.error("[background-worker] tick.failed", { error: message, failures: state.consecutiveFailures });
    } finally {
      state.running = false;
      state.lastTickFinishedAt = new Date().toISOString();
      schedule(nextDelayMs);
    }
  };

  schedule(3_000);
  console.log("[background-worker] started", { activeIntervalMs, idleIntervalMs, idleBackoffIntervalMs, maxIdleIntervalMs, aiLimit, aiWorkerEnabled, crawlerBatchSize, workerId: state.workerId });
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

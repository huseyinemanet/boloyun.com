import "server-only";

import { runTranslationAutomationTick } from "./db-ai";

type WorkerState = {
  started: boolean;
  running: boolean;
  timer: NodeJS.Timeout | null;
};

const DEFAULT_ACTIVE_INTERVAL_MS = 15_000;
const DEFAULT_IDLE_INTERVAL_MS = 300_000;
const DEFAULT_LIMIT = 5;
const MIN_INTERVAL_MS = 5_000;
const MAX_ACTIVE_INTERVAL_MS = 120_000;
const MIN_IDLE_INTERVAL_MS = 60_000;
const MAX_IDLE_INTERVAL_MS = 1_800_000;

declare global {
  var __boloyunAiAutomationWorker: WorkerState | undefined;
}

export function startAiAutomationWorker() {
  if (!shouldStartWorker()) return;

  const state = globalThis.__boloyunAiAutomationWorker ?? {
    started: false,
    running: false,
    timer: null,
  };
  globalThis.__boloyunAiAutomationWorker = state;

  if (state.started) return;
  state.started = true;

  const activeIntervalMs = readIntegerEnv("AI_AUTOMATION_WORKER_INTERVAL_MS", DEFAULT_ACTIVE_INTERVAL_MS, MIN_INTERVAL_MS, MAX_ACTIVE_INTERVAL_MS);
  const idleIntervalMs = readIntegerEnv("AI_AUTOMATION_WORKER_IDLE_INTERVAL_MS", DEFAULT_IDLE_INTERVAL_MS, MIN_IDLE_INTERVAL_MS, MAX_IDLE_INTERVAL_MS);
  const limit = readIntegerEnv("AI_AUTOMATION_WORKER_LIMIT", DEFAULT_LIMIT, 1, 25);

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
    let nextDelayMs = idleIntervalMs;
    try {
      const result = await runTranslationAutomationTick("worker", { limit });
      if (result.status === "completed") nextDelayMs = activeIntervalMs;
      if (result.status === "error") {
        console.error("[ai-translation] worker.tick.error", { message: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ai-translation] worker.tick.failed", { error: message });
    } finally {
      state.running = false;
      schedule(nextDelayMs);
    }
  };

  schedule(3_000);
  console.log("[ai-translation] worker.started", { activeIntervalMs, idleIntervalMs, limit });
}

function shouldStartWorker() {
  const configured = process.env.AI_AUTOMATION_WORKER_ENABLED?.toLowerCase();
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

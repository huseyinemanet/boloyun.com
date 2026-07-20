export type BackgroundWorkerState = {
  started: boolean;
  running: boolean;
  timer: NodeJS.Timeout | null;
  workerId: string | null;
  lastTickStartedAt: string | null;
  lastTickFinishedAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
};

declare global {
  var __boloyunBackgroundWorker: BackgroundWorkerState | undefined;
}

export function getBackgroundWorkerState() {
  const state = globalThis.__boloyunBackgroundWorker ?? {
    started: false,
    running: false,
    timer: null,
    workerId: null,
    lastTickStartedAt: null,
    lastTickFinishedAt: null,
    consecutiveFailures: 0,
    lastError: null,
  };
  globalThis.__boloyunBackgroundWorker = state;
  return state;
}

export function getBackgroundWorkerHealth() {
  const state = getBackgroundWorkerState();
  const lastActivity = state.running ? state.lastTickStartedAt : state.lastTickFinishedAt;
  const staleAfterMs = readIntegerEnv("BACKGROUND_WORKER_STALE_AFTER_MS", 30 * 60_000, 60_000, 60 * 60_000);
  const isFresh = Boolean(lastActivity && Date.now() - new Date(lastActivity).getTime() <= staleAfterMs);
  const healthy = state.started && isFresh && state.consecutiveFailures === 0;
  return {
    healthy,
    started: state.started,
    running: state.running,
    workerId: state.workerId,
    lastTickStartedAt: state.lastTickStartedAt,
    lastTickFinishedAt: state.lastTickFinishedAt,
    consecutiveFailures: state.consecutiveFailures,
    lastError: state.lastError,
  };
}

function readIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

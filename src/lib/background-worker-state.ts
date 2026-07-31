export type BackgroundWorkerState = {
  started: boolean;
  running: boolean;
  timer: NodeJS.Timeout | null;
  schedule: ((delayMs: number) => void) | null;
  workerId: string | null;
  lastTickStartedAt: string | null;
  lastTickFinishedAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  idleStreak: number;
  nextTickAt: string | null;
  wakePending: boolean;
  lastMaintenanceDay: string | null;
};

declare global {
  var __boloyunBackgroundWorker: BackgroundWorkerState | undefined;
}

export function getBackgroundWorkerState() {
  const state = globalThis.__boloyunBackgroundWorker ?? {
    started: false,
    running: false,
    timer: null,
    schedule: null,
    workerId: null,
    lastTickStartedAt: null,
    lastTickFinishedAt: null,
    consecutiveFailures: 0,
    lastError: null,
    idleStreak: 0,
    nextTickAt: null,
    wakePending: false,
    lastMaintenanceDay: null,
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
    idleStreak: state.idleStreak,
    nextTickAt: state.nextTickAt,
    wakePending: state.wakePending,
  };
}

export function wakeBackgroundWorker() {
  const state = getBackgroundWorkerState();
  if (!state.started || !state.schedule) return { accepted: false as const, reason: "not-started" as const };

  state.idleStreak = 0;
  if (state.running) {
    state.wakePending = true;
    return { accepted: true as const, status: "pending" as const };
  }

  state.wakePending = false;
  state.schedule(0);
  return { accepted: true as const, status: "scheduled" as const };
}

function readIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export type BackgroundWorkerIntervals = {
  activeMs: number;
  firstIdleMs: number;
  backedOffIdleMs: number;
  maxIdleMs: number;
};

export function nextSuccessfulTickSchedule(input: {
  hasWork: boolean;
  idleStreak: number;
  wakePending: boolean;
  intervals: BackgroundWorkerIntervals;
}) {
  if (input.hasWork || input.wakePending) {
    return { delayMs: input.intervals.activeMs, idleStreak: 0 };
  }

  const idleStreak = input.idleStreak + 1;
  if (idleStreak === 1) return { delayMs: input.intervals.firstIdleMs, idleStreak };
  if (idleStreak === 2) return { delayMs: input.intervals.backedOffIdleMs, idleStreak };
  return { delayMs: input.intervals.maxIdleMs, idleStreak };
}

export function nextFailureDelay(consecutiveFailures: number, intervals: BackgroundWorkerIntervals) {
  const exponent = Math.max(0, Math.min(10, consecutiveFailures - 1));
  return Math.min(intervals.maxIdleMs, intervals.firstIdleMs * (2 ** exponent));
}

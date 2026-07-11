import "server-only";

export async function measuredQuery<T>(label: string, query: PromiseLike<T>, slowMs = Number(process.env.SLOW_QUERY_MS ?? 750)): Promise<T> {
  const startedAt = performance.now();
  try {
    return await query;
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    if (durationMs >= slowMs) console.warn("Slow database query", { label, durationMs });
  }
}

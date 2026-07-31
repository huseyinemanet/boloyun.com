import "server-only";

const WAKE_TIMEOUT_MS = 1_500;

export async function requestBackgroundWorkerWake(fetcher: typeof fetch = fetch) {
  const url = process.env.BACKGROUND_WORKER_WAKE_URL?.trim();
  const token = process.env.INTERNAL_HEALTH_CHECK_TOKEN?.trim();
  if (!url || !token) return { sent: false as const, reason: "not-configured" as const };

  const response = await fetcher(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(WAKE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Worker uyandırma isteği ${response.status} döndürdü.`);
  return { sent: true as const };
}

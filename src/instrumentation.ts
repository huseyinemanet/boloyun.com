export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBackgroundWorker } = await import("@/lib/ai/automation-worker");
  startBackgroundWorker();
}

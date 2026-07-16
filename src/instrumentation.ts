export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startAiAutomationWorker } = await import("@/lib/ai/automation-worker");
  startAiAutomationWorker();
}

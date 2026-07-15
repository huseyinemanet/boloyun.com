import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runTranslationAutomationTick } from "@/lib/ai/db-ai";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const secret = process.env.AI_TRANSLATION_CRON_SECRET;
  const isCron = Boolean(secret && auth === `Bearer ${secret}`);
  if (!isCron) await requireAdmin();

  const body = await request.json().catch(() => null) as { source?: unknown } | null;
  const source = isCron ? "cron" : typeof body?.source === "string" ? body.source : "admin";

  try {
    console.log("[ai-translation] automation.api.start", { source });
    const result = await runTranslationAutomationTick(source);
    console.log("[ai-translation] automation.api.done", result);
    return NextResponse.json({
      ...result,
      attempted: "job" in result && result.job && "attempted" in result.job && typeof result.job.attempted === "number" ? result.job.attempted : 0,
      processed: "job" in result && result.job && "processed" in result.job && typeof result.job.processed === "number" ? result.job.processed : 0,
      failed: "job" in result && result.job && "failedStep" in result.job && typeof result.job.failedStep === "number" ? result.job.failedStep : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-translation] automation.api.failed", { source, error: message });
    return NextResponse.json({ status: "error", message });
  }
}

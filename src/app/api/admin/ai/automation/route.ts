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
    const status = result.status === "error" ? 500 : 200;
    console.log("[ai-translation] automation.api.done", result);
    return NextResponse.json(result, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-translation] automation.api.failed", { source, error: message });
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

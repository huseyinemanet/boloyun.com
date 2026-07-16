import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getTranslationAutomation, getTranslationStats, saveTranslationAutomation } from "@/lib/ai/db-ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireAdmin();

  const body = await request.json().catch(() => null) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Otomasyon durumu eksik." }, { status: 400 });
  }

  try {
    const current = await getTranslationAutomation();
    await saveTranslationAutomation({
      enabled: body.enabled,
      dailyTarget: current.dailyTarget,
      perRunLimit: current.perRunLimit,
      retryFailed: current.retryFailed,
    });
    const [automation, stats] = await Promise.all([
      getTranslationAutomation(),
      getTranslationStats(),
    ]);
    return NextResponse.json(
      { automation, stats, serverTime: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Otomasyon durumu güncellenemedi.";
    console.error("[ai-translation] automation.state.failed", { error: message });
    return NextResponse.json({ error: message, serverTime: new Date().toISOString() }, { status: 500 });
  }
}

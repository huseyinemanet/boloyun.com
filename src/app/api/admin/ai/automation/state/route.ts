import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getTranslationAutomation, getTranslationStats, saveTranslationAutomation } from "@/lib/ai/db-ai";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { recordAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const admin = await requireAdmin();

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
    await recordAdminAudit({
      actorProfileId: admin.id,
      action: "ai.automation_update",
      targetType: "ai_translation_automation",
      targetIds: ["default"],
      details: { enabled: body.enabled },
    }).catch((auditError) => console.error("[admin-audit] AI otomasyon kaydı yazılamadı", auditError));
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

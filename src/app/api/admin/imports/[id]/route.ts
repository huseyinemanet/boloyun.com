import { NextResponse } from "next/server";
import { parseImportIntent, runImportWorkflow, type ImportIntent } from "@/import/admin/import-workflow";
import { getCurrentProfile } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin" || profile.status !== "active") return NextResponse.redirect(new URL(`/giris?next=/admin/imports/${id}`, request.url), 303);
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });

  let intent: ImportIntent = "save";
  try {
    const formData = await request.formData();
    intent = parseImportIntent(formData.get("intent"));
    const workflow = await runImportWorkflow(id, intent, formData);
    await recordAdminAudit({
      actorProfileId: profile.id,
      action: `import.${intent}`,
      targetType: "game_import",
      targetIds: [id],
      details: { title: workflow.item.ai_title_tr || workflow.item.original_title || "Başlıksız oyun", status: workflow.item.import_status },
    }).catch((error) => console.error("[admin-import] audit failed", error));

    if (intent === "approve" || intent === "reject" || intent === "needs_fix") {
      const status = intent === "approve" ? "approved" : intent === "reject" ? "rejected" : "needs_fix";
      return NextResponse.redirect(new URL(`/admin/imports?status=${status}&notice=${workflow.notice}`, request.url), 303);
    }
    return NextResponse.redirect(new URL(`/admin/imports/${id}?notice=${workflow.notice}`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import işlemi tamamlanamadı.";
    const url = new URL(`/admin/imports/${id}`, request.url);
    url.searchParams.set("error", message.slice(0, 240));
    url.searchParams.set("intent", intent);
    return NextResponse.redirect(url, 303);
  }
}

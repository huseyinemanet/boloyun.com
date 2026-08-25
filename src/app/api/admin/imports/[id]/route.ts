import { NextResponse } from "next/server";
import { parseImportIntent, runImportWorkflow, type ImportIntent } from "@/import/admin/import-workflow";
import { recordAdminAudit } from "@/lib/admin-audit";
import { publicUrlFromRequest } from "@/lib/request-origin";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { authorizeAdminRoute } from "@/lib/security/admin-route-access";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const access = await authorizeAdminRoute(request, { mode: "redirect", continuePath: `/admin/imports/${id}` });
  if (!access.allowed) return access.response;

  let intent: ImportIntent = "save";
  try {
    const formData = await request.formData();
    intent = parseImportIntent(formData.get("intent"));
    const workflow = await runImportWorkflow(id, intent, formData);
    await recordAdminAudit({
      actorProfileId: access.admin.id,
      action: `import.${intent}`,
      targetType: "game_import",
      targetIds: [id],
      details: { title: workflow.item.ai_title_tr || workflow.item.original_title || "Başlıksız oyun", status: workflow.item.import_status },
    }).catch((error) => console.error("[admin-import] audit failed", error));

    if (intent === "approve" || intent === "reject" || intent === "needs_fix") {
      const status = intent === "approve" ? "approved" : intent === "reject" ? "rejected" : "needs_fix";
      return NextResponse.redirect(publicUrlFromRequest(request, `/admin/imports?status=${status}&notice=${workflow.notice}`), 303);
    }
    return NextResponse.redirect(publicUrlFromRequest(request, `/admin/imports/${id}?notice=${workflow.notice}`), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import işlemi tamamlanamadı.";
    const url = publicUrlFromRequest(request, `/admin/imports/${id}`);
    url.searchParams.set("error", message.slice(0, 240));
    url.searchParams.set("intent", intent);
    return NextResponse.redirect(url, 303);
  }
}

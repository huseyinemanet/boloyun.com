import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { updateAdminGameFromForm } from "@/lib/games/admin-update-service";
import { recordAdminAudit } from "@/lib/admin-audit";
import { publicUrlFromRequest } from "@/lib/request-origin";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin" || profile.status !== "active") {
    return NextResponse.redirect(publicUrlFromRequest(request, `/giris?next=/admin/games/${id}/edit`), 303);
  }

  try {
    await updateAdminGameFromForm(id, await request.formData());
    await recordAdminAudit({ actorProfileId: profile.id, action: "game.update", targetType: "game", targetIds: [id] })
      .catch((auditError) => console.error("[admin-game] audit failed", auditError));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oyun güncellenemedi.";
    const url = publicUrlFromRequest(request, `/admin/games/${id}/edit`);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.redirect(publicUrlFromRequest(request, "/admin/games?notice=updated"), 303);
}

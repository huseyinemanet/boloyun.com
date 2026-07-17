import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { updateAdminGameFromForm } from "@/lib/admin-game-update";
import { recordAdminAudit } from "@/lib/admin-audit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin" || profile.status !== "active") {
    return NextResponse.redirect(new URL(`/giris?next=/admin/games/${id}/edit`, request.url), 303);
  }

  try {
    await updateAdminGameFromForm(id, await request.formData());
    await recordAdminAudit({ actorProfileId: profile.id, action: "game.update", targetType: "game", targetIds: [id] })
      .catch((auditError) => console.error("[admin-game] audit failed", auditError));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oyun güncellenemedi.";
    const url = new URL(`/admin/games/${id}/edit`, request.url);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.redirect(new URL("/admin/games?notice=updated", request.url), 303);
}

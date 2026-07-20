"use server";

import { revalidatePath } from "next/cache";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/auth";
import { updateGameReportStatuses, type GameReportStatus } from "@/lib/db-game-reports";

export async function updateGameReportsAction(formData: FormData) {
  const admin = await requireAdmin();
  const status = String(formData.get("status") ?? "") as GameReportStatus;
  if (!(["pending", "reviewing", "resolved", "rejected"] as string[]).includes(status)) return;
  const ids = [...new Set(formData.getAll("report_id").map(String).filter(isUuid))].slice(0, 100);
  if (ids.length === 0) return;

  await updateGameReportStatuses({ ids, status, reviewerProfileId: admin.id });
  await recordAdminAudit({
    actorProfileId: admin.id,
    action: "game_report.status",
    targetType: "content_reports",
    targetIds: ids,
    details: { status },
  }).catch((error) => console.error("[game-report-admin] audit failed", error));
  revalidatePath("/admin/games");
  revalidatePath("/admin/games/reports");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

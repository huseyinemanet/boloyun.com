"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { approveImportRecord } from "@/import/publish/approve-imports";
import { getImportById, updateImportStatus } from "@/import/db/game-imports";
import { requireAdmin } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requestPublicSiteRebuild } from "@/lib/public-site-rebuild";

export async function approveImportAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await approveImportByIdAction(id);
}

export async function approveImportByIdAction(id: string) {
  const admin = await requireAdmin();
  const item = await getImportById(id);
  await approveImportRecord(item);
  await recordAdminAudit({ actorProfileId: admin.id, action: "import.approve", targetType: "game_import", targetIds: [id] });
  await requestPublicSiteRebuild(`import.approve:${id}`, admin.id);
  revalidateTag("games", "max");
  revalidateTag("categories", "max");
  revalidateTag("tags", "max");
  revalidatePath("/");
  revalidateTag("games", "max");
  revalidateTag("categories", "max");
  revalidateTag("tags", "max");
  revalidatePath("/admin/imports");
  revalidatePath("/admin/games");
}

export async function approveSelectedImportsAction(formData: FormData) {
  const ids = formData.getAll("ids").map(String).filter(Boolean);

  await approveImportIdsAction(ids);
}

export async function approveImportIdsAction(ids: string[]) {
  const admin = await requireAdmin();
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const id of ids) {
    try {
      const item = await getImportById(id);
      await approveImportRecord(item);
      results.push({ id, ok: true });
    } catch (error) {
      results.push({
        id,
        ok: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    }
  }
  await recordAdminAudit({ actorProfileId: admin.id, action: "import.bulk_approve", targetType: "game_import", targetIds: ids, details: { succeeded: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length } });
  if (results.some((result) => result.ok)) {
    await requestPublicSiteRebuild(`import.bulk_approve:${results.filter((result) => result.ok).length}`, admin.id);
  }

  revalidatePath("/");
  revalidatePath("/admin/imports");
  revalidatePath("/admin/games");

  return results;
}

export async function rejectImportAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateImportStatusAction(id, "rejected");
}

export async function updateImportStatusAction(id: string, status: "rejected" | "needs_fix") {
  const admin = await requireAdmin();
  await updateImportStatus(id, status);
  await recordAdminAudit({ actorProfileId: admin.id, action: `import.${status}`, targetType: "game_import", targetIds: [id] });
  revalidatePath("/admin/imports");
}

export async function needsFixImportAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateImportStatusAction(id, "needs_fix");
}

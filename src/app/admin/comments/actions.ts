"use server";

import { revalidatePath } from "next/cache";
import { deleteTrashedComment, deleteTrashedComments, updateCommentStatus, updateCommentStatuses } from "@/lib/db-comments";
import { requireAdmin } from "@/lib/auth";
import { invalidatePublicContent } from "@/lib/public-cache-invalidation";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function approveCommentAction(formData: FormData) {
  await updateComment(formData, "approved");
}

export async function unapproveCommentAction(formData: FormData) {
  await updateComment(formData, "pending");
}

export async function spamCommentAction(formData: FormData) {
  await updateComment(formData, "spam");
}

export async function trashCommentAction(formData: FormData) {
  await updateComment(formData, "trash");
}

export async function bulkUpdateCommentsAction(ids: string[], status: "pending" | "approved" | "spam" | "trash") {
  const admin = await requireAdmin();
  await updateCommentStatuses(ids, status);
  await recordAdminAudit({ actorProfileId: admin.id, action: "comment.bulk_status", targetType: "comments", targetIds: ids, details: { status } }).catch(logAuditError);
  invalidatePublicContent({ kind: "comments" });
  revalidatePath("/admin/comments");
}

export async function deleteTrashedCommentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return;

  await deleteTrashedComment(id);
  await recordAdminAudit({ actorProfileId: admin.id, action: "comment.delete", targetType: "comment", targetIds: [id] }).catch(logAuditError);
  invalidatePublicContent({ kind: "comments", gameSlug: slug || undefined });
  revalidatePath("/admin/comments");
}

export async function bulkDeleteTrashedCommentsAction(ids: string[]) {
  const admin = await requireAdmin();
  await deleteTrashedComments(ids);
  await recordAdminAudit({ actorProfileId: admin.id, action: "comment.bulk_delete", targetType: "comments", targetIds: ids }).catch(logAuditError);
  invalidatePublicContent({ kind: "comments" });
  revalidatePath("/admin/comments");
}

async function updateComment(formData: FormData, status: "pending" | "approved" | "spam" | "trash") {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return;

  await updateCommentStatus(id, status);
  await recordAdminAudit({ actorProfileId: admin.id, action: "comment.status", targetType: "comment", targetIds: [id], details: { status } }).catch(logAuditError);
  invalidatePublicContent({ kind: "comments", gameSlug: slug || undefined });
  revalidatePath("/admin/comments");
}

function logAuditError(error: unknown) {
  console.error("[admin-comment] audit failed", error);
}

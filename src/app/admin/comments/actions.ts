"use server";

import { revalidatePath } from "next/cache";
import { deleteTrashedComment, deleteTrashedComments, updateCommentStatus, updateCommentStatuses } from "@/lib/db-comments";
import { requireAdmin } from "@/lib/auth";
import { invalidatePublicContent } from "@/lib/public-cache-invalidation";

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
  await requireAdmin();
  await updateCommentStatuses(ids, status);
  invalidatePublicContent({ kind: "comments" });
  revalidatePath("/admin/comments");
}

export async function deleteTrashedCommentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return;

  await deleteTrashedComment(id);
  invalidatePublicContent({ kind: "comments", gameSlug: slug || undefined });
  revalidatePath("/admin/comments");
}

export async function bulkDeleteTrashedCommentsAction(ids: string[]) {
  await requireAdmin();
  await deleteTrashedComments(ids);
  invalidatePublicContent({ kind: "comments" });
  revalidatePath("/admin/comments");
}

async function updateComment(formData: FormData, status: "pending" | "approved" | "spam" | "trash") {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return;

  await updateCommentStatus(id, status);
  invalidatePublicContent({ kind: "comments", gameSlug: slug || undefined });
  revalidatePath("/admin/comments");
}

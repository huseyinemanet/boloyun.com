"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  deleteAdminUsers,
  sendAdminPasswordReset,
  updateAdminUser,
  updateAdminUsersRole,
  updateAdminUsersStatus,
} from "@/lib/db-users";
import type { UserRole, UserStatus } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function updateUserAction(formData: FormData) {
  const currentAdmin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = normalizeRole(String(formData.get("role") ?? "member"));
  const status = normalizeStatus(String(formData.get("status") ?? "active"));

  if (currentAdmin.id === id && (role !== "admin" || status !== "active")) {
    throw new Error("Kendi admin yetkini veya aktif durumunu kaldıramazsın.");
  }

  await updateAdminUser(id, {
    email: String(formData.get("email") ?? "").trim(),
    firstName: String(formData.get("first_name") ?? "").trim(),
    lastName: String(formData.get("last_name") ?? "").trim(),
    displayName: String(formData.get("display_name") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    website: String(formData.get("website") ?? "").trim(),
    avatarUrl: String(formData.get("avatar_url") ?? "").trim(),
    role,
    status,
  });
  await recordAdminAudit({ actorProfileId: currentAdmin.id, action: "user.update", targetType: "profile", targetIds: [id], details: { role, status } });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}/edit`);
  redirect("/admin/users");
}

export async function bulkUpdateUsersAction(ids: string[], action: "block" | "unblock" | "delete" | "make_admin" | "make_member") {
  const currentAdmin = await requireAdmin();
  const safeIds = ids.filter(Boolean);
  if (!safeIds.length) return;

  if (safeIds.includes(currentAdmin.id) && ["block", "delete", "make_member"].includes(action)) {
    throw new Error("Kendi hesabına bu toplu işlemi uygulayamazsın.");
  }

  if (action === "block") {
    await updateAdminUsersStatus(safeIds, "blocked");
  } else if (action === "unblock") {
    await updateAdminUsersStatus(safeIds, "active");
  } else if (action === "delete") {
    await deleteAdminUsers(safeIds);
  } else if (action === "make_admin") {
    await updateAdminUsersRole(safeIds, "admin");
  } else {
    await updateAdminUsersRole(safeIds, "member");
  }
  await recordAdminAudit({ actorProfileId: currentAdmin.id, action: `user.bulk_${action}`, targetType: "profile", targetIds: safeIds });

  revalidatePath("/admin/users");
}

export async function sendPasswordResetAction(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const id = String(formData.get("id") ?? "");
  await sendAdminPasswordReset(email);
  redirect(`/admin/users/${id}/edit?notice=password-reset`);
}

function normalizeRole(value: string): UserRole {
  return value === "admin" ? "admin" : "member";
}

function normalizeStatus(value: string): UserStatus {
  return value === "blocked" ? "blocked" : "active";
}

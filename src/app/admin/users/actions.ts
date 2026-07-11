"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  createAdminUser,
  deleteAdminUsers,
  sendAdminPasswordReset,
  updateAdminUser,
  updateAdminUsersRole,
  updateAdminUsersStatus,
} from "@/lib/db-users";
import type { UserRole, UserStatus } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";

export type CreateUserFormValues = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  password: string;
  role: UserRole;
};

export type CreateUserFormState = {
  status: "idle" | "error";
  message: string;
  fieldErrors: Partial<Record<keyof CreateUserFormValues, string>>;
  values: CreateUserFormValues;
};

export async function createUserAction(_previousState: CreateUserFormState, formData: FormData): Promise<CreateUserFormState> {
  const admin = await requireAdmin();

  const values: CreateUserFormValues = {
    username: String(formData.get("username") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    display_name: String(formData.get("display_name") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    role: normalizeRole(String(formData.get("role") ?? "member")),
  };

  const fieldErrors = validateCreateUser(values);
  if (Object.keys(fieldErrors).length) {
    return {
      status: "error",
      message: "Lütfen işaretli alanları kontrol edin.",
      fieldErrors,
      values,
    };
  }

  try {
    const authUserId = await createAdminUser({
      email: values.email,
      password: values.password,
      username: values.username,
      firstName: values.first_name,
      lastName: values.last_name,
      displayName: values.display_name,
      role: values.role,
    });
    await recordAdminAudit({ actorProfileId: admin.id, action: "user.create", targetType: "auth_user", details: { authUserId, role: values.role } });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Kullanıcı oluşturulamadı.",
      fieldErrors: {},
      values,
    };
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

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

function validateCreateUser(values: CreateUserFormValues): CreateUserFormState["fieldErrors"] {
  const errors: CreateUserFormState["fieldErrors"] = {};

  if (!values.username) errors.username = "Kullanıcı adı gerekli.";
  else if (values.username.length < 3) errors.username = "Kullanıcı adı en az 3 karakter olmalı.";

  if (!values.email) errors.email = "E-posta gerekli.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Geçerli bir e-posta girin.";

  if (!values.password) errors.password = "Geçici şifre gerekli.";
  else if (values.password.length < 8) errors.password = "Geçici şifre en az 8 karakter olmalı.";

  return errors;
}

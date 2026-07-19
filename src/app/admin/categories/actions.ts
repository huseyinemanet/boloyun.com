"use server";

import { revalidatePath } from "next/cache";
import { recordAdminAudit } from "@/lib/admin-audit";
import { upsertAdminCategory } from "@/lib/db-categories";
import { requireAdmin } from "@/lib/auth";
import { invalidatePublicContent } from "@/lib/public-cache-invalidation";

export type CategoryFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: {
    name?: string;
    slug?: string;
  };
};

export async function saveCategoryAction(_previousState: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const fieldErrors: CategoryFormState["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Kategori adı gerekli.";
  if (!slug) fieldErrors.slug = "Slug gerekli.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Lütfen zorunlu alanları doldurun.",
      fieldErrors,
    };
  }

  try {
    await upsertAdminCategory(formData);
    await recordAdminAudit({
      actorProfileId: admin.id,
      action: id ? "category.update" : "category.create",
      targetType: "category",
      targetIds: id ? [id] : [],
      details: { name, slug },
    }).catch(logAuditError);
  } catch (error) {
    console.error("Kategori kaydedilemedi.", error);
    return {
      status: "error",
      message: "Kategori kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.",
      fieldErrors: {},
    };
  }

  revalidatePath("/admin/categories");
  invalidatePublicContent({ kind: "categories", categorySlug: slug });

  return {
    status: "success",
    message: id ? "Kategori güncellendi." : "Kategori eklendi.",
    fieldErrors: {},
  };
}

function logAuditError(error: unknown) {
  console.error("[admin-audit] kategori kaydı yazılamadı", error);
}

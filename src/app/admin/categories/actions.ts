"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { upsertAdminCategory } from "@/lib/db-categories";
import { requireAdmin } from "@/lib/auth";
import { publicRebuildMessage, requestPublicSiteRebuild } from "@/lib/public-site-rebuild";

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
  } catch (error) {
    console.error("Kategori kaydedilemedi.", error);
    return {
      status: "error",
      message: "Kategori kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.",
      fieldErrors: {},
    };
  }

  revalidatePath("/admin/categories");
  revalidateTag("categories", "max");
  revalidatePath("/");
  revalidatePath(`/kategori/${slug}`);
  const rebuild = await requestPublicSiteRebuild(`category.save:${slug}`, admin.id);
  const rebuildMessage = publicRebuildMessage(rebuild);

  return {
    status: "success",
    message: rebuildMessage || "Kategori kaydedildi.",
    fieldErrors: {},
  };
}

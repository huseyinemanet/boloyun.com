"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveAdminTag } from "@/lib/db-tags";
import { publicRebuildMessage, requestPublicSiteRebuild } from "@/lib/public-site-rebuild";

export type TagFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: {
    name?: string;
    slug?: string;
    og_image_url?: string;
  };
};

export async function saveTagAction(_previousState: TagFormState, formData: FormData): Promise<TagFormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const ogImageUrl = String(formData.get("og_image_url") ?? "").trim();
  const fieldErrors: TagFormState["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Etiket adı gerekli.";
  if (!slug) fieldErrors.slug = "Slug gerekli.";
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fieldErrors.slug = "Slug yalnız küçük harf, rakam ve tire içermeli.";
  if (ogImageUrl && !isValidUrl(ogImageUrl)) fieldErrors.og_image_url = "Geçerli bir görsel URL’si girin.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Lütfen işaretli alanları düzeltin.",
      fieldErrors,
    };
  }

  try {
    await saveAdminTag(formData);
  } catch (error) {
    console.error("Etiket kaydedilemedi.", error);
    return {
      status: "error",
      message: "Etiket kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.",
      fieldErrors: {},
    };
  }

  revalidatePath("/admin/tags");
  revalidateTag("tags", "max");
  if (slug) revalidatePath(`/etiket/${slug}`);
  revalidatePath("/sitemap.xml");
  const rebuild = await requestPublicSiteRebuild(`tag.save:${slug}`, admin.id);
  const rebuildMessage = publicRebuildMessage(rebuild);

  return {
    status: "success",
    message: rebuildMessage || "Etiket kaydedildi.",
    fieldErrors: {},
  };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

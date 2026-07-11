"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteAdminStaticPage, saveAdminStaticPage } from "@/lib/db-static-pages";

export type StaticPageFormValues = {
  id: string;
  title: string;
  slug: string;
  content: string;
  seo_title: string;
  seo_description: string;
  status: string;
  og_image_url: string;
  is_indexable: boolean;
};

export type StaticPageFormState = {
  status: "idle" | "error";
  message: string;
  fieldErrors: Partial<Record<keyof StaticPageFormValues, string>>;
  values?: StaticPageFormValues;
};

export async function saveStaticPageAction(_state: StaticPageFormState, formData: FormData): Promise<StaticPageFormState> {
  await requireAdmin();
  const values = readStaticPageFormValues(formData);
  const fieldErrors = validateStaticPageFormValues(values);

  if (Object.keys(fieldErrors).length) {
    return {
      status: "error",
      message: "Lütfen işaretli alanları kontrol edin.",
      fieldErrors,
      values,
    };
  }

  try {
    await saveAdminStaticPage(formData);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Sayfa kaydedilemedi.",
      fieldErrors: {},
      values,
    };
  }

  revalidatePath("/admin/static-pages");
  revalidateTag("static-pages", "max");
  if (values.slug) revalidatePath(`/sayfa/${values.slug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/static-pages");
}

export async function deleteStaticPageAction(id: string, slug: string) {
  await requireAdmin();
  if (!id) throw new Error("Statik sayfa kimliği eksik.");
  await deleteAdminStaticPage(id);
  revalidatePath("/admin/static-pages");
  revalidateTag("static-pages", "max");
  if (slug) revalidatePath(`/sayfa/${slug}`);
  revalidatePath("/sitemap.xml");
}

function readStaticPageFormValues(formData: FormData): StaticPageFormValues {
  return {
    id: String(formData.get("id") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
    seo_title: String(formData.get("seo_title") ?? "").trim(),
    seo_description: String(formData.get("seo_description") ?? "").trim(),
    status: String(formData.get("status") ?? "published"),
    og_image_url: String(formData.get("og_image_url") ?? "").trim(),
    is_indexable: formData.get("is_indexable") === "on",
  };
}

function validateStaticPageFormValues(values: StaticPageFormValues): StaticPageFormState["fieldErrors"] {
  const fieldErrors: StaticPageFormState["fieldErrors"] = {};

  if (!values.title) fieldErrors.title = "Başlık gerekli.";
  if (!values.slug) {
    fieldErrors.slug = "Slug gerekli.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    fieldErrors.slug = "Slug küçük harf, rakam ve tire içermeli.";
  }

  if (!values.content) {
    fieldErrors.content = "İçerik gerekli.";
  } else if (!hasValidEditorBlock(values.content)) {
    fieldErrors.content = "En az bir bölüm başlığı ve paragraf ekleyin.";
  }

  if (!["published", "draft"].includes(values.status)) fieldErrors.status = "Geçerli bir durum seçin.";

  if (values.og_image_url && !isValidUrl(values.og_image_url)) {
    fieldErrors.og_image_url = "Geçerli bir URL girin.";
  }

  return fieldErrors;
}

function hasValidEditorBlock(value: string) {
  return value.split(/\n\s*---\s*\n/).some((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.length >= 2;
  });
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

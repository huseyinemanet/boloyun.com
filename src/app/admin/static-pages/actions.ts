"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteAdminStaticPage, saveAdminStaticPage } from "@/lib/db-static-pages";

export async function saveStaticPageAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  await saveAdminStaticPage(formData);
  revalidatePath("/admin/static-pages");
  revalidateTag("static-pages", "max");
  if (slug) revalidatePath(`/sayfa/${slug}`);
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

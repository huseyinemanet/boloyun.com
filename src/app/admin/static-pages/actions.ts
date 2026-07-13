"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteAdminStaticPage } from "@/lib/db-static-pages";

export async function deleteStaticPageAction(id: string, slug: string) {
  await requireAdmin();
  if (!id) throw new Error("Statik sayfa kimliği eksik.");
  await deleteAdminStaticPage(id);
  revalidatePath("/admin/static-pages");
  revalidateTag("static-pages", "max");
  if (slug) revalidatePath(`/sayfa/${slug}`);
  revalidatePath("/sitemap.xml");
}

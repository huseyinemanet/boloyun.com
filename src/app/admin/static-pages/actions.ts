"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteAdminStaticPage } from "@/lib/db-static-pages";
import { requestPublicSiteRebuild } from "@/lib/public-site-rebuild";

export async function deleteStaticPageAction(id: string, slug: string) {
  const admin = await requireAdmin();
  if (!id) throw new Error("Statik sayfa kimliği eksik.");
  await deleteAdminStaticPage(id);
  revalidatePath("/admin/static-pages");
  revalidateTag("static-pages", "max");
  if (slug) revalidatePath(`/sayfa/${slug}`);
  revalidatePath("/sitemap.xml");
  await requestPublicSiteRebuild(`static_page.delete:${slug || id}`, admin.id);
}

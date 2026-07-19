"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/auth";
import { deleteAdminStaticPage } from "@/lib/db-static-pages";

export async function deleteStaticPageAction(id: string, slug: string) {
  const admin = await requireAdmin();
  if (!id) throw new Error("Statik sayfa kimliği eksik.");
  await deleteAdminStaticPage(id);
  await recordAdminAudit({
    actorProfileId: admin.id,
    action: "static_page.delete",
    targetType: "static_page",
    targetIds: [id],
    details: { slug },
  }).catch((error) => console.error("[admin-audit] statik sayfa silme kaydı yazılamadı", error));
  revalidatePath("/admin/static-pages");
  revalidateTag("static-pages", "max");
  if (slug) revalidatePath(`/sayfa/${slug}`);
  revalidatePath("/sitemap.xml");
}

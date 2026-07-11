"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { saveAdminTag } from "@/lib/db-tags";

export async function saveTagAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  await saveAdminTag(formData);
  revalidatePath("/admin/tags");
  revalidateTag("tags", "max");
  if (slug) revalidatePath(`/etiket/${slug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/tags");
}

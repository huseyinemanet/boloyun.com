import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSettingsIndexPage() {
  await requireAdmin();
  redirect("/admin/settings/general");
}

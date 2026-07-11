import { redirect } from "next/navigation";

export default async function AdminSettingsIndexPage() {
  redirect("/admin/settings/general");
}

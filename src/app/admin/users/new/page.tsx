import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { UserCreateForm } from "./user-create-form";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Yeni Kullanıcı Ekle");

export default async function NewAdminUserPage() {
  await requireAdmin();
  return (
    <div className="space-y-3">
      <AdminPageHeader title="Yeni Kullanıcı Ekle" description="Üyelik hesabı oluştur, rolünü seç ve gerekirse yönetici yetkisi ver." />
      <UserCreateForm />
    </div>
  );
}

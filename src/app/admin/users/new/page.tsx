import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { UserCreateForm } from "./user-create-form";

export const metadata = adminPageMetadata("Yeni Kullanıcı Ekle");

export default function NewAdminUserPage() {
  return (
    <div className="space-y-3">
      <AdminPageHeader title="Yeni Kullanıcı Ekle" description="Üyelik hesabı oluştur, rolünü seç ve gerekirse yönetici yetkisi ver." />
      <UserCreateForm />
    </div>
  );
}

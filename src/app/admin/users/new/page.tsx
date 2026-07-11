import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserCreateForm } from "./user-create-form";

export default function NewAdminUserPage() {
  return (
    <div className="space-y-3">
      <AdminPageHeader title="Yeni Kullanıcı Ekle" description="Üyelik hesabı oluştur, rolünü seç ve gerekirse yönetici yetkisi ver." />
      <UserCreateForm />
    </div>
  );
}

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StaticPageForm } from "../static-page-form";

export default function NewStaticPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <AdminPageHeader title="Yeni Sayfa Ekle" description="Yeni bir bilgi veya politika sayfası oluşturun." />
      <StaticPageForm />
    </div>
  );
}

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { StaticPageRow } from "@/lib/db-static-pages";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { StaticPageForm } from "../static-page-form";

export const metadata = adminPageMetadata("Yeni Sayfa Ekle");

export default function NewStaticPage() {
  const page: StaticPageRow = {
    id: "",
    title: "",
    slug: "",
    content: null,
    content_json: { updatedAt: "", sections: [] },
    seo_title: "",
    seo_description: "",
    status: "draft",
    og_image_url: null,
    is_indexable: true,
    created_at: null,
    updated_at: null,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <AdminPageHeader title="Yeni Sayfa Ekle" description="Yeni bir bilgi veya politika sayfası oluşturun." />
      <StaticPageForm page={page} mode="create" />
    </div>
  );
}

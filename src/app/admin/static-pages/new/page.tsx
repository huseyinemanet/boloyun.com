import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StaticPageForm } from "../static-page-form";

const emptyStaticPage = {
  id: "",
  title: "",
  slug: "",
  content: null,
  content_json: null,
  seo_title: null,
  seo_description: null,
  status: "draft",
  og_image_url: null,
  is_indexable: true,
};

export default function NewStaticPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <AdminPageHeader title="Yeni Sayfa Ekle" description="Yeni bir bilgi veya politika sayfası oluşturun." />
      <StaticPageForm page={emptyStaticPage} mode="create" />
    </div>
  );
}

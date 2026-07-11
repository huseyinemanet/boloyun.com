import { PlusIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getAdminStaticPages } from "@/lib/db-static-pages";
import { StaticPagesTable } from "./static-pages-table";

export const dynamic = "force-dynamic";

export default async function AdminStaticPagesPage() {
  const pages = await getAdminStaticPages();

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Statik Sayfalar"
        description="Bilgi ve politika sayfalarını oluştur, düzenle, yayınla veya kaldır."
        actions={(
          <Button asChild variant="outline" className="h-10 font-bold">
            <a href="/admin/static-pages/new">
              <PlusIcon />
              Yeni Sayfa Ekle
            </a>
          </Button>
        )}
      />
      <StaticPagesTable pages={pages.map(({ id, title, slug, seo_title, seo_description, status, updated_at }) => ({
        id,
        title,
        slug,
        seo_title,
        seo_description,
        status,
        updated_at,
      }))} />
    </div>
  );
}

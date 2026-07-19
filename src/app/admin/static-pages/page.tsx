import Link from "next/link";
import { IconSquareDashedTextPlusFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconSquareDashedTextPlusFillDuo18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getAdminStaticPages } from "@/lib/db-static-pages";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { StaticPagesTable } from "./static-pages-table";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Sayfalar");

export default async function AdminStaticPagesPage() {
  await requireAdmin();
  const pages = await getAdminStaticPages();

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Sayfalar"
        description="Bilgi ve politika sayfalarını oluştur, düzenle, yayınla veya kaldır."
        actions={(
          <Button asChild variant="outline" className="h-10 font-bold">
            <Link href="/admin/static-pages/new">
              <IconSquareDashedTextPlusFillDuo18 className="size-4" />
              Yeni Sayfa Ekle
            </Link>
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

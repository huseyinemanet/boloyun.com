import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminStaticPage } from "@/lib/db-static-pages";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { StaticPageForm } from "../../static-page-form";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Sayfayı Düzenle");

type Props = { params: Promise<{ id: string }> };

export default async function EditStaticPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const page = await getAdminStaticPage(id);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <AdminPageHeader title="Sayfayı Düzenle" description={`“${page.title}” sayfasının içeriğini ve yayın ayarlarını güncelleyin.`} />
      <StaticPageForm page={page} />
    </div>
  );
}

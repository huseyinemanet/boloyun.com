import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminStaticPage } from "@/lib/db-static-pages";
import { StaticPageForm } from "../../static-page-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditStaticPage({ params }: Props) {
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

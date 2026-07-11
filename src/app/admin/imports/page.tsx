import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination, parseAdminPage } from "@/components/admin/admin-pagination";
import { getAdminImportsPage } from "@/import/db/game-imports";
import { ImportsTable } from "./imports-table";

export const dynamic = "force-dynamic";
const PER_PAGE = 50;

type ImportsPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  const currentPage = parseAdminPage((await searchParams).page);
  const { items: imports, total } = await getAdminImportsPage({ page: currentPage, perPage: PER_PAGE });

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Onay Kuyruğu"
        description="Yeni bulunan oyunları burada kontrol edip yayınlayabilirsin."
      />

      {total > 0 ? <AdminPagination currentPage={currentPage} perPage={PER_PAGE} total={total} basePath="/admin/imports" itemName="oyun" /> : null}
      <ImportsTable imports={imports} />
      {total > 0 ? <AdminPagination currentPage={currentPage} perPage={PER_PAGE} total={total} basePath="/admin/imports" itemName="oyun" /> : null}
    </div>
  );
}

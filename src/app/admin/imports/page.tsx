import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCursorPagination } from "@/components/admin/admin-cursor-pagination";
import { getAdminImportsPage } from "@/import/db/game-imports";
import { decodeKeysetCursor, parseKeysetDirection } from "@/lib/keyset-pagination";
import { ImportsTable } from "./imports-table";

export const dynamic = "force-dynamic";
const PER_PAGE = 50;

type ImportsPageProps = {
  searchParams: Promise<{
    cursor?: string;
    direction?: string;
  }>;
};

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  const params = await searchParams;
  const cursor = decodeKeysetCursor(params.cursor);
  const direction = parseKeysetDirection(params.direction);
  const { items: imports, previousCursor, nextCursor } = await getAdminImportsPage({ cursor, direction, perPage: PER_PAGE });

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Onay Kuyruğu"
        description="Yeni bulunan oyunları burada kontrol edip yayınlayabilirsin."
      />

      <AdminCursorPagination basePath="/admin/imports" itemCount={imports.length} itemName="oyun" previousCursor={previousCursor} nextCursor={nextCursor} />
      <ImportsTable imports={imports} />
      <AdminCursorPagination basePath="/admin/imports" itemCount={imports.length} itemName="oyun" previousCursor={previousCursor} nextCursor={nextCursor} />
    </div>
  );
}

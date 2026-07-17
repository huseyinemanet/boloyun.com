import Link from "next/link";
import { AdminCursorPagination } from "@/components/admin/admin-cursor-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getAdminImportsPage, getAdminImportStats, parseAdminImportFilter } from "@/import/db/game-imports";
import { decodeKeysetCursor, parseKeysetDirection } from "@/lib/keyset-pagination";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { ImportNoticeToast } from "./import-notice-toast";
import { ImportStatusTabs } from "./import-status-tabs";
import { ImportsTable } from "./imports-table";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("İnceleme Kuyruğu");
const PER_PAGE = 50;

type Props = { searchParams: Promise<{ status?: string; cursor?: string; direction?: string; notice?: string; error?: string }> };

export default async function AdminImportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = parseAdminImportFilter(params.status);
  const [page, counts] = await Promise.all([
    getAdminImportsPage({ cursor: decodeKeysetCursor(params.cursor), direction: parseKeysetDirection(params.direction), perPage: PER_PAGE, filter }),
    getAdminImportStats(),
  ]);
  const rows = page.items.map((item) => ({
    id: item.id,
    title: item.ai_title_tr || item.original_title || "Başlıksız oyun",
    thumbnailUrl: item.thumbnail_url,
    sourceUrl: item.source_url,
    sourceDomain: item.source_domain,
    status: item.import_status,
    errorMessage: item.error_message,
    updatedAt: item.updated_at,
  }));

  return <div className="space-y-3">
    <ImportNoticeToast notice={params.notice} error={params.error} />
    <AdminPageHeader title="İnceleme Kuyruğu" description="Taranan oyunları kontrol et, düzenle ve yayınla." actions={<Button asChild variant="outline"><Link href="/admin/crawler">Yeni Oyun Tara</Link></Button>} />
    <ImportStatusTabs active={filter} counts={counts} />
    <AdminCursorPagination basePath="/admin/imports" itemCount={rows.length} itemName="kayıt" previousCursor={page.previousCursor} nextCursor={page.nextCursor} query={{ status: filter }} />
    <ImportsTable rows={rows} />
    <AdminCursorPagination basePath="/admin/imports" itemCount={rows.length} itemName="kayıt" previousCursor={page.previousCursor} nextCursor={page.nextCursor} query={{ status: filter }} />
  </div>;
}

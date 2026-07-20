import Image from "next/image";
import Link from "next/link";
import { ExternalLinkIcon, Gamepad2Icon, PencilIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getAdminGameReportGroups, type GameReportStatus } from "@/lib/db-game-reports";
import { formatFullDateTime, formatRelativeDateTime } from "@/lib/date-time";
import { gameReportReasonLabels, isGameReportReason } from "@/lib/game-report-validation";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { updateGameReportsAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Oyun Bildirimleri");

type ReportFilter = GameReportStatus | "all";
type Props = { searchParams: Promise<{ status?: string }> };

const filters: Array<{ value: ReportFilter; label: string }> = [
  { value: "pending", label: "Bekleyen" },
  { value: "reviewing", label: "İncelenen" },
  { value: "resolved", label: "Çözülen" },
  { value: "rejected", label: "Geçersiz" },
  { value: "all", label: "Tümü" },
];

export default async function AdminGameReportsPage({ searchParams }: Props) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeFilter = filters.some((filter) => filter.value === status) ? status as ReportFilter : "pending";
  const groups = await getAdminGameReportGroups(activeFilter === "all" ? undefined : activeFilter);

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Oyun Bildirimleri"
        description="Oyuncuların çalışmadığını bildirdiği oyunları incele ve sonuçlandır. Bir bildirim oyunu otomatik olarak pasife almaz."
        actions={<Button asChild variant="outline"><Link href="/admin/games"><Gamepad2Icon data-icon="inline-start" />Oyunlara Dön</Link></Button>}
      />

      <nav aria-label="Bildirim durumları" className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <Button key={filter.value} asChild size="sm" variant={activeFilter === filter.value ? "secondary" : "ghost"}>
            <Link href={filter.value === "pending" ? "/admin/games/reports" : `/admin/games/reports?status=${filter.value}`}>{filter.label}</Link>
          </Button>
        ))}
      </nav>

      {groups.length === 0 ? (
        <section className="rounded-md border border-border bg-card px-4 py-14 text-center">
          <p className="font-semibold">Bu durumda oyun bildirimi yok.</p>
          <p className="mt-1 text-sm text-muted-foreground">Yeni bir bildirim geldiğinde burada görünecek.</p>
        </section>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <section key={group.game.id} className="overflow-hidden rounded-md border border-border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {group.game.thumbnailUrl ? (
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image src={group.game.thumbnailUrl} alt="" fill sizes="80px" unoptimized className="object-cover" />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold">{group.game.title}</h2>
                      {group.game.isBroken ? <Badge variant="destructive">Bozuk olarak işaretli</Badge> : null}
                      <Badge variant="secondary">{group.reports.length} bildirim</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground" title={formatFullDateTime(group.latestAt)}>
                      Son bildirim {formatRelativeDateTime(group.latestAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild size="sm" variant="outline"><Link href={`/admin/games/${group.game.id}/edit`}><PencilIcon data-icon="inline-start" />Düzenle</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link href={`/oyun/${group.game.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon data-icon="inline-start" />Oyunu Aç</Link></Button>
                </div>
              </div>

              <div className="divide-y divide-border">
                {group.reports.map((report) => (
                  <div key={report.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{reportReasonLabel(report.reason)}</p>
                        <Badge variant={statusBadgeVariant(report.status)}>{statusLabel(report.status)}</Badge>
                      </div>
                      {report.details ? <p className="mt-1 text-sm leading-6 text-muted-foreground">“{report.details}”</p> : null}
                    </div>
                    <p className="text-xs text-muted-foreground sm:text-right" title={formatFullDateTime(report.createdAt)}>
                      {report.reporterUsername ? `@${report.reporterUsername} · ` : "Misafir · "}{formatRelativeDateTime(report.createdAt)}
                    </p>
                  </div>
                ))}
              </div>

              <form action={updateGameReportsAction} className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/20 p-3">
                {group.reports.map((report) => <input key={report.id} type="hidden" name="report_id" value={report.id} />)}
                <Button type="submit" name="status" value="rejected" size="sm" variant="ghost">Geçersiz Say</Button>
                <Button type="submit" name="status" value="reviewing" size="sm" variant="outline">İncelemeye Al</Button>
                <Button type="submit" name="status" value="resolved" size="sm">Çözüldü Olarak İşaretle</Button>
              </form>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: GameReportStatus) {
  return { pending: "Bekliyor", reviewing: "İnceleniyor", resolved: "Çözüldü", rejected: "Geçersiz" }[status];
}

function statusBadgeVariant(status: GameReportStatus): "secondary" | "outline" | "destructive" {
  if (status === "pending") return "destructive";
  if (status === "reviewing") return "secondary";
  return "outline";
}

function reportReasonLabel(reason: string) {
  if (isGameReportReason(reason)) return gameReportReasonLabels[reason];
  return {
    inappropriate: "Uygunsuz içerik",
    copyright: "Telif hakkı sorunu",
    spam: "Spam veya yanıltıcı içerik",
  }[reason] ?? "Başka bir sorun";
}

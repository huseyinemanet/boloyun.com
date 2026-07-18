import Link from "next/link";
import { IconCloudFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCloudFillDuo18";
import { IconDatabaseFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconDatabaseFillDuo18";
import { IconEnvelopeFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconEnvelopeFillDuo18";
import { IconGamepadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadFillDuo18";
import { IconGlobe2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGlobe2FillDuo18";
import { IconGridCircleListFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGridCircleListFillDuo18";
import { IconMediaPlayFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMediaPlayFillDuo18";
import { IconMsgs2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMsgs2FillDuo18";
import { IconNodes4FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconNodes4FillDuo18";
import { IconServerFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconServerFillDuo18";
import { IconCircleCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleCheckFillDuo18";
import { IconUsersFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconUsersFillDuo18";
import { IconWindowCodeFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconWindowCodeFillDuo18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { getAdminOverviewData } from "@/lib/db-admin-overview";
import { formatFullDateTime, formatRelativeDateTime } from "@/lib/date-time";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { PopularGamesTable } from "./popular-games-table";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Genel Bakış");

export default async function AdminPage() {
  const overview = await getAdminOverviewData();
  const attention = [
    { label: "İnceleme bekleyen import", value: overview.attention.reviewImports, href: "/admin/imports?status=review" },
    { label: "Düzeltilmesi gereken import", value: overview.attention.needsFixImports, href: "/admin/imports?status=needs_fix" },
    { label: "Başarısız import", value: overview.attention.failedImports, href: "/admin/imports?status=failed" },
    { label: "Bozuk oyun", value: overview.attention.brokenGames, href: "/admin/games?health=broken" },
    { label: "Kapak senkronizasyon sorunu", value: overview.attention.coverIssues, href: "/admin/games?health=cover" },
    { label: "Onay bekleyen yorum", value: overview.attention.pendingComments, href: "/admin/comments?status=pending" },
  ].filter((item) => item.value > 0);
  const totals = [
    { label: "Toplam Oyun", value: overview.totals.games, icon: IconGamepadFillDuo18 },
    { label: "Toplam Kategori", value: overview.totals.categories, icon: IconGridCircleListFillDuo18 },
    { label: "Toplam Yorum", value: overview.totals.comments, icon: IconMsgs2FillDuo18 },
    { label: "Toplam Kullanıcı", value: overview.totals.users, icon: IconUsersFillDuo18 },
  ];
  const popularGameRows = overview.popularGames.map((game, index) => ({
    id: game.id,
    rank: index + 1,
    title: game.title,
    categoryName: game.categoryName,
    thumbnailUrl: game.thumbnailUrl,
    playCount: game.playCount,
    favoriteCount: game.favoriteCount,
    likesCount: game.likesCount,
    ratingAvg: game.ratingAvg,
    popularityScore: game.popularityScore,
  }));
  const runtimeDetails = [
    { label: "Next.js", value: overview.system.runtime.next, icon: IconWindowCodeFillDuo18 },
    { label: "React", value: overview.system.runtime.react, icon: IconNodes4FillDuo18 },
    { label: "Node.js", value: overview.system.runtime.node, icon: IconServerFillDuo18 },
    { label: "Veritabanı", value: `${overview.system.runtime.database} · Supabase`, icon: IconDatabaseFillDuo18 },
  ];

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Genel Bakış"
        description="Aksiyon gerektiren işleri ve sitenin kısa durumunu buradan takip edebilirsin."
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Dikkat Gerektirenler</CardTitle>
          <CardDescription>İncelenmesi veya düzeltilmesi gereken kayıtlar.</CardDescription>
        </CardHeader>
        <CardContent>
          {attention.length ? (
            <div className="grid gap-0">
              {attention.map((item, index) => (
                <div key={item.href}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-2"><Badge variant="destructive">{item.value.toLocaleString("tr-TR")}</Badge><span>{item.label}</span></div>
                    <Button asChild size="sm" variant="ghost"><Link href={item.href}>İncele</Link></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty className="flex-none gap-1.5 px-3 py-1">
              <EmptyMedia className="mb-0 text-primary">
                <IconCircleCheckFillDuo18 className="size-6" aria-hidden="true" />
              </EmptyMedia>
              <EmptyHeader className="gap-0.5"><EmptyTitle>Dikkat gerektiren iş yok</EmptyTitle><EmptyDescription>Aktif operasyon kayıtları temiz görünüyor.</EmptyDescription></EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="short-performance-title">
        <h2 id="short-performance-title" className="mb-2 font-medium">Kısa Performans</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Son 24 saat oyun açılışı" value={overview.performance.plays24Hours} />
          <MetricCard label="Son 7 gün oyun açılışı" value={overview.performance.plays7Days} />
        </div>
      </section>

      <Card size="sm">
        <CardHeader><CardTitle>İçerik Özeti</CardTitle><CardDescription>Yayındaki içerik ve hesap toplamları.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {totals.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3">
                <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="text-lg font-medium tabular-nums">{stat.value.toLocaleString("tr-TR")}</p></div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {popularGameRows.length ? <PopularGamesTable games={popularGameRows} /> : null}

      <div className="grid gap-3 xl:grid-cols-2">
        <Card size="sm">
          <CardHeader><CardTitle>Son İşlemler</CardTitle><CardDescription>Kaydedilen son beş yönetici işlemi.</CardDescription></CardHeader>
          <CardContent>
            {overview.activities.length ? overview.activities.map((activity, index) => (
              <div key={activity.id}>
                {index > 0 ? <Separator /> : null}
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      {activity.actorAvatarUrl ? <AvatarImage src={activity.actorAvatarUrl} alt={activity.actor} /> : null}
                      <AvatarFallback>{actorInitials(activity.actor)}</AvatarFallback>
                    </Avatar>
                    <div><p className="font-medium">{activity.title}</p><p className="text-xs text-muted-foreground">{activity.actor} · {activity.target}</p></div>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={activity.createdAt} title={formatFullDateTime(activity.createdAt)}>{formatRelativeDateTime(activity.createdAt)}</time>
                </div>
              </div>
            )) : <Empty><EmptyHeader><EmptyTitle>Henüz işlem kaydı yok</EmptyTitle></EmptyHeader></Empty>}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="gap-0.5"><CardTitle>Sistem Durumu</CardTitle><CardDescription>Temel servis bağlantıları.</CardDescription></CardHeader>
          <CardContent className="grid gap-0">
            <SystemRow label="Veritabanı" status={overview.system.database} icon={IconDatabaseFillDuo18} />
            <Separator />
            <SystemRow label="Cloudflare R2" status={overview.system.r2} icon={IconCloudFillDuo18} />
            <Separator />
            <SystemRow label="CDN" status={overview.system.cdn} icon={IconGlobe2FillDuo18} />
            <Separator />
            <SystemRow label="E-posta servisi (Brevo)" status={overview.system.email} icon={IconEnvelopeFillDuo18} />
            <div className="mt-2 border-t pt-2">
              <p className="py-1 text-xs font-medium text-muted-foreground">Teknik altyapı</p>
              <dl>
                {runtimeDetails.map((detail, index) => (
                  <div key={detail.label}>
                    {index > 0 ? <Separator /> : null}
                    <TechnicalRow label={detail.label} value={detail.value} icon={detail.icon} />
                  </div>
                ))}
              </dl>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm" className="gap-1">
      <CardHeader><CardTitle>{label}</CardTitle><CardAction><IconMediaPlayFillDuo18 className="size-5 text-primary" aria-hidden="true" /></CardAction></CardHeader>
      <CardContent><p className="text-2xl font-medium tabular-nums">{value.toLocaleString("tr-TR")}</p></CardContent>
    </Card>
  );
}

function SystemRow({ label, status, icon: Icon }: { label: string; status: string; icon: typeof IconDatabaseFillDuo18 }) {
  const connected = status === "Bağlı" || status === "Yapılandırıldı";
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />{label}</span>
      <Badge variant={connected ? "default" : "outline"}>{status}</Badge>
    </div>
  );
}

function TechnicalRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof IconDatabaseFillDuo18 }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="flex items-center gap-2"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />{label}</dt>
      <dd className="text-sm text-muted-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function actorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

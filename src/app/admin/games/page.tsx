import Image from "next/image";
import Link from "next/link";
import { IconBadgeCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBadgeCheckFillDuo18";
import { IconCircleImageFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleImageFillDuo18";
import { IconCodeActionFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCodeActionFillDuo18";
import { IconGamepadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadFillDuo18";
import { IconMediaPlayFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMediaPlayFillDuo18";
import { IconOpenInNewWindowFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconOpenInNewWindowFillDuo18";
import { IconPencilFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPencilFillDuo18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCursorPagination } from "@/components/admin/admin-cursor-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminGamesPage } from "@/lib/db-games";
import type { AdminGameHealthFilter } from "@/lib/db-games";
import type { PublishStatus } from "@/types/game";
import { decodeKeysetCursor, parseKeysetDirection } from "@/lib/keyset-pagination";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { GameNoticeToast } from "./game-notice-toast";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Oyunlar");
const PER_PAGE = 50;

type AdminGamesPageProps = {
  searchParams: Promise<{
    cursor?: string;
    direction?: string;
    notice?: string;
    health?: string;
  }>;
};

export default async function AdminGamesPage({ searchParams }: AdminGamesPageProps) {
  const params = await searchParams;
  const cursor = decodeKeysetCursor(params.cursor);
  const direction = parseKeysetDirection(params.direction);
  const health: AdminGameHealthFilter = params.health === "broken" || params.health === "cover" ? params.health : "all";
  const { items: games, previousCursor, nextCursor } = await getAdminGamesPage({ cursor, direction, perPage: PER_PAGE, health });

  return (
    <div className="space-y-3">
      <GameNoticeToast notice={params.notice} />

      <AdminPageHeader
        title="Oyunlar"
        description="Yayındaki, taslak ve pasif oyunları buradan düzenleyebilirsin."
        actions={(
          <ButtonGroup aria-label="Oyun sağlık filtresi">
            <Button asChild size="sm" variant={health === "all" ? "default" : "outline"}><Link href="/admin/games">Tümü</Link></Button>
            <ButtonGroupSeparator />
            <Button asChild size="sm" variant={health === "broken" ? "default" : "outline"}><Link href="/admin/games?health=broken">Bozuk</Link></Button>
            <ButtonGroupSeparator />
            <Button asChild size="sm" variant={health === "cover" ? "default" : "outline"}><Link href="/admin/games?health=cover">Kapak Sorunu</Link></Button>
          </ButtonGroup>
        )}
      />

      <AdminCursorPagination basePath="/admin/games" itemCount={games.length} itemName="oyun" previousCursor={previousCursor} nextCursor={nextCursor} query={{ health: health === "all" ? undefined : health }} />
      <section className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-20">
                <span className="inline-flex items-center justify-center" title="Görsel" aria-label="Görsel">
                  <IconCircleImageFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="Oyun" aria-label="Oyun">
                  <IconGamepadFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead className="w-[110px]">
                <span className="inline-flex items-center justify-center" title="Durum" aria-label="Durum">
                  <IconBadgeCheckFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead className="w-[110px] text-center">
                <span className="inline-flex items-center justify-center" title="Oynanma" aria-label="Oynanma">
                  <IconMediaPlayFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead className="w-[170px] text-right">
                <span className="inline-flex items-center justify-center" title="Aksiyon" aria-label="Aksiyon">
                  <IconCodeActionFillDuo18 className="size-5" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((game) => (
              <TableRow key={game.id}>
                <TableCell>
                  <Link href={`/admin/games/${game.id}/edit`} aria-label={`${game.title} oyununu düzenle`} className="relative block h-12 w-16 overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Image src={game.thumbnailUrl} alt={game.title} fill sizes="64px" unoptimized className="object-cover" />
                  </Link>
                </TableCell>
                <TableCell className="min-w-[320px] whitespace-normal">
                  <Link href={`/admin/games/${game.id}/edit`} className="font-semibold text-primary hover:underline">
                    {game.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 max-w-3xl text-xs leading-5 text-muted-foreground">{game.shortDescription}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(game.status)}>{getStatusLabel(game.status)}</Badge>
                  {game.isBroken ? <Badge className="ml-1" variant="destructive">Bozuk</Badge> : null}
                  {game.thumbnailSyncStatus && ["pending", "failed", "rolled_back"].includes(game.thumbnailSyncStatus) ? <Badge className="ml-1" variant="outline">Kapak</Badge> : null}
                </TableCell>
                <TableCell className="text-center tabular-nums">{game.playCount.toLocaleString("tr-TR")}</TableCell>
                <TableCell>
                  <ButtonGroup className="ml-auto" aria-label={`${game.title} oyun aksiyonları`}>
                    <Button asChild size="icon-sm" variant="outline">
                      <Link
                        href={`/admin/games/${game.id}/edit`}
                        aria-label={`${game.title} oyununu düzenle`}
                        title="Düzenle"
                      >
                        <IconPencilFillDuo18 className="size-4" />
                      </Link>
                    </Button>
                    <ButtonGroupSeparator />
                    <Button asChild size="icon-sm" variant="outline">
                      <Link
                        href={`/oyun/${game.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${game.title} oyununu yeni sekmede aç`}
                        title="Yeni sekmede aç"
                      >
                        <IconOpenInNewWindowFillDuo18 className="size-4" />
                      </Link>
                    </Button>
                  </ButtonGroup>
                </TableCell>
              </TableRow>
            ))}
            {games.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center font-medium text-muted-foreground">
                  Bu sayfada oyun yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>
      <AdminCursorPagination basePath="/admin/games" itemCount={games.length} itemName="oyun" previousCursor={previousCursor} nextCursor={nextCursor} query={{ health: health === "all" ? undefined : health }} />
    </div>
  );
}

function getStatusLabel(status: PublishStatus) {
  const labels: Record<PublishStatus, string> = {
    draft: "Taslak",
    published: "Yayında",
    inactive: "Pasif",
  };

  return labels[status] ?? status;
}

function getStatusBadgeVariant(status: PublishStatus): "default" | "secondary" | "outline" {
  if (status === "published") return "default";
  if (status === "draft") return "secondary";
  return "outline";
}

import Image from "next/image";
import Link from "next/link";
import { IconOpenInNewWindowFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconOpenInNewWindowFillDuo18";
import { IconPencilFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPencilFillDuo18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCursorPagination } from "@/components/admin/admin-cursor-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminGamesPage } from "@/lib/db-games";
import type { PublishStatus } from "@/types/game";
import { decodeKeysetCursor, parseKeysetDirection } from "@/lib/keyset-pagination";

export const dynamic = "force-dynamic";
const PER_PAGE = 50;

type AdminGamesPageProps = {
  searchParams: Promise<{
    cursor?: string;
    direction?: string;
  }>;
};

export default async function AdminGamesPage({ searchParams }: AdminGamesPageProps) {
  const params = await searchParams;
  const cursor = decodeKeysetCursor(params.cursor);
  const direction = parseKeysetDirection(params.direction);
  const { items: games, previousCursor, nextCursor } = await getAdminGamesPage({ cursor, direction, perPage: PER_PAGE });

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Oyunlar" description="Yayındaki, taslak ve pasif oyunları buradan düzenleyebilirsin." />

      <AdminCursorPagination basePath="/admin/games" itemCount={games.length} itemName="oyun" previousCursor={previousCursor} nextCursor={nextCursor} />
      <section className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-20">Görsel</TableHead>
              <TableHead>Oyun</TableHead>
              <TableHead className="w-[110px]">Durum</TableHead>
              <TableHead className="w-[110px] text-center">Oynanma</TableHead>
              <TableHead className="w-[170px] text-right">Aksiyon</TableHead>
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
      <AdminCursorPagination basePath="/admin/games" itemCount={games.length} itemName="oyun" previousCursor={previousCursor} nextCursor={nextCursor} />
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

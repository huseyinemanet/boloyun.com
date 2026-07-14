import Image from "next/image";
import Link from "next/link";
import { IconGamepadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadFillDuo18";
import { IconGridCircleListFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGridCircleListFillDuo18";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { IconMediaPlayFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMediaPlayFillDuo18";
import { IconMsgs2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMsgs2FillDuo18";
import { IconRankingStarFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconRankingStarFillDuo18";
import { IconStarFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconStarFillDuo18";
import { IconThumbsUpFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconThumbsUpFillDuo18";
import { IconUsersFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconUsersFillDuo18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getPublishedGamesCount } from "@/lib/db-games";
import { getAdminPopularGames, type AdminPopularGame } from "@/lib/db-games";
import { getCategoriesCount } from "@/lib/db-categories";
import { getCommentsCount } from "@/lib/db-comments";
import { getUsersCount } from "@/lib/db-users";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [gamesCount, categoriesCount, commentsCount, usersCount, popularGames] = await Promise.all([
    getPublishedGamesCount(),
    getCategoriesCount(),
    getCommentsCount(),
    getUsersCount(),
    getAdminPopularGames(8),
  ]);
  const stats = [
    { label: "Toplam Oyun", value: gamesCount, href: "/admin/games", icon: IconGamepadFillDuo18 },
    { label: "Toplam Kategori", value: categoriesCount, href: "/admin/categories", icon: IconGridCircleListFillDuo18 },
    { label: "Toplam Yorum", value: commentsCount, href: "/admin/comments", icon: IconMsgs2FillDuo18 },
    { label: "Toplam Kullanıcı", value: usersCount, href: "/admin/users", icon: IconUsersFillDuo18 },
  ];

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Genel Bakış" description="Sitenin genel durumunu ve öne çıkan oyunları buradan görebilirsin." />
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Link key={stat.label} href={stat.href} className="rounded-md border border-border bg-card p-4 transition hover:border-primary hover:bg-primary/10">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value.toLocaleString("tr-TR")}</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      {popularGames.length ? <PopularGamesSection games={popularGames} /> : null}
    </div>
  );
}

function PopularGamesSection({ games }: { games: AdminPopularGame[] }) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <div className="border-b border-border bg-muted/40 p-4">
        <h2 className="font-bold">Popüler Oyunlar</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Oynanma, favori, beğeni ve puanlama sinyallerine göre sıralanır.</p>
      </div>
      <Table className="min-w-[760px] table-fixed">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-16 text-center">
              <span className="inline-flex items-center justify-center" title="Sıra" aria-label="Sıra">
                <IconRankingStarFillDuo18 className="size-5" />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center justify-center" title="Oyun" aria-label="Oyun">
                <IconGamepadFillDuo18 className="size-5" />
              </span>
            </TableHead>
            <TableHead className="w-24 text-center">
              <span className="inline-flex items-center justify-center" title="Skor" aria-label="Skor">
                <IconRankingStarFillDuo18 className="size-5" />
              </span>
            </TableHead>
            <TableHead className="w-24 text-center">
              <span className="inline-flex items-center justify-center" title="Oynama" aria-label="Oynama">
                <IconMediaPlayFillDuo18 className="size-5" />
              </span>
            </TableHead>
            <TableHead className="w-24 text-center">
              <span className="inline-flex items-center justify-center" title="Favori" aria-label="Favori">
                <IconHeartFillDuo18 className="size-5" />
              </span>
            </TableHead>
            <TableHead className="w-24 text-center">
              <span className="inline-flex items-center justify-center" title="Beğeni" aria-label="Beğeni">
                <IconThumbsUpFillDuo18 className="size-5" />
              </span>
            </TableHead>
            <TableHead className="w-20 text-center">
              <span className="inline-flex items-center justify-center" title="Puan" aria-label="Puan">
                <IconStarFillDuo18 className="size-5" />
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {games.map((game, index) => (
              <TableRow key={game.id}>
                <TableCell className="text-base font-bold text-muted-foreground">#{index + 1}</TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex min-w-0 items-center gap-3">
                    <Link href={`/admin/games/${game.id}/edit`} aria-label={`${game.title} oyununu düzenle`} className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Image
                        src={game.thumbnailUrl}
                        alt={game.title}
                        width={72}
                        height={40}
                        unoptimized
                        className="h-10 w-auto rounded-md object-contain"
                        style={{ width: "auto" }}
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/admin/games/${game.id}/edit`} className="block truncate font-bold text-primary hover:underline">
                        {game.title}
                      </Link>
                      {game.categoryName ? <p className="truncate text-xs leading-4 text-muted-foreground">{game.categoryName}</p> : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center text-foreground">
                  {Math.round(game.popularityScore).toLocaleString("tr-TR")}
                </TableCell>
                <TableCell className="text-center text-foreground">{game.playCount.toLocaleString("tr-TR")}</TableCell>
                <TableCell className="text-center text-foreground">{game.favoriteCount.toLocaleString("tr-TR")}</TableCell>
                <TableCell className="text-center text-foreground">{game.likesCount.toLocaleString("tr-TR")}</TableCell>
                <TableCell className="text-center text-foreground">{game.ratingAvg.toFixed(1)}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
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
    { label: "Toplam Oyun", value: gamesCount, href: "/admin/games" },
    { label: "Toplam Kategori", value: categoriesCount, href: "/admin/categories" },
    { label: "Toplam Yorum", value: commentsCount, href: "/admin/comments" },
    { label: "Toplam Kullanıcı", value: usersCount, href: "/admin/users" },
  ];

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Genel Bakış" description="Sitenin genel durumunu ve öne çıkan oyunları buradan görebilirsin." />
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-md border border-border bg-card p-4 transition hover:border-primary hover:bg-primary/10">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">{stat.value.toLocaleString("tr-TR")}</p>
          </Link>
        ))}
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
            <TableHead className="w-16">Sıra</TableHead>
            <TableHead>Oyun</TableHead>
            <TableHead className="w-24 text-center">Skor</TableHead>
            <TableHead className="w-24 text-center">Oynama</TableHead>
            <TableHead className="w-24 text-center">Favori</TableHead>
            <TableHead className="w-24 text-center">Beğeni</TableHead>
            <TableHead className="w-20 text-center">Puan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {games.map((game, index) => (
              <TableRow key={game.id}>
                <TableCell className="text-base font-bold text-muted-foreground">#{index + 1}</TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex min-w-0 items-center gap-3">
                    <Image src={game.thumbnailUrl} alt={game.title} width={72} height={40} unoptimized className="h-10 w-auto shrink-0 rounded-md object-contain" />
                    <div className="min-w-0">
                      <Link href={`/oyun/${game.slug}`} target="_blank" className="block truncate font-bold text-primary hover:underline">
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

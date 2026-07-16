import { IconGamepadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadFillDuo18";
import { IconGridCircleListFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGridCircleListFillDuo18";
import { IconMsgs2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMsgs2FillDuo18";
import { IconUsersFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconUsersFillDuo18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getPublishedGamesCount } from "@/lib/db-games";
import { getAdminPopularGames } from "@/lib/db-games";
import { getCategoriesCount } from "@/lib/db-categories";
import { getCommentsCount } from "@/lib/db-comments";
import { getUsersCount } from "@/lib/db-users";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { PopularGamesTable } from "./popular-games-table";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Genel Bakış");

export default async function AdminPage() {
  const [gamesCount, categoriesCount, commentsCount, usersCount, popularGames] = await Promise.all([
    getPublishedGamesCount(),
    getCategoriesCount(),
    getCommentsCount(),
    getUsersCount(),
    getAdminPopularGames(10),
  ]);
  const stats = [
    { label: "Toplam Oyun", value: gamesCount, icon: IconGamepadFillDuo18 },
    { label: "Toplam Kategori", value: categoriesCount, icon: IconGridCircleListFillDuo18 },
    { label: "Toplam Yorum", value: commentsCount, icon: IconMsgs2FillDuo18 },
    { label: "Toplam Kullanıcı", value: usersCount, icon: IconUsersFillDuo18 },
  ];
  const popularGameRows = popularGames.map((game, index) => ({
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

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Genel Bakış" description="Sitenin genel durumunu ve öne çıkan oyunları buradan görebilirsin." />
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.label} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-4 text-muted-foreground">{stat.label}</p>
                  <p className="mt-0.5 text-2xl font-bold leading-none">{stat.value.toLocaleString("tr-TR")}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {popularGameRows.length ? <PopularGamesTable games={popularGameRows} /> : null}
    </div>
  );
}

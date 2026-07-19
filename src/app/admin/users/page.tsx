import Link from "next/link";
import { IconUserPlusFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconUserPlusFillDuo18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth";
import { AdminPagination, parseAdminPage } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { getAdminUserCounts, getAdminUsersPage, type AdminUserFilter } from "@/lib/db-users";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { UserNoticeToast } from "./user-notice-toast";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Kullanıcılar");

type Props = {
  searchParams: Promise<{ role?: string; page?: string; notice?: string }>;
};

const validFilters: AdminUserFilter[] = ["all", "admin", "member", "blocked"];
const PER_PAGE = 50;

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();
  const { role, page: pageValue, notice } = await searchParams;
  const activeFilter = validFilters.includes(role as AdminUserFilter) ? (role as AdminUserFilter) : "all";
  const page = parseAdminPage(pageValue);
  const [{ items: users, total }, counts] = await Promise.all([getAdminUsersPage({ page, perPage: PER_PAGE, filter: activeFilter }), getAdminUserCounts()]);

  return (
    <div className="space-y-3">
      <UserNoticeToast notice={notice} />

      <AdminPageHeader
        title="Kullanıcılar"
        description="Üyeleri, yöneticileri, rolleri ve hesap durumlarını yönet."
        actions={(
          <Button asChild variant="outline" className="h-10 px-3 text-sm font-bold">
            <Link href="/admin/users/new">
              <IconUserPlusFillDuo18 className="size-4" />
              Yeni Kullanıcı Ekle
            </Link>
          </Button>
        )}
      />

      <AdminPagination currentPage={page} perPage={PER_PAGE} total={total} basePath="/admin/users" itemName="kullanıcı" queryParams={activeFilter === "all" ? undefined : { role: activeFilter }} />
      <UsersTable users={users} counts={counts} activeFilter={activeFilter} />
    </div>
  );
}

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination, parseAdminPage } from "@/components/admin/admin-pagination";
import { getAdminUserCounts, getAdminUsersPage, type AdminUserFilter } from "@/lib/db-users";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ role?: string; page?: string }>;
};

const validFilters: AdminUserFilter[] = ["all", "admin", "member", "blocked"];
const PER_PAGE = 50;

export default async function AdminUsersPage({ searchParams }: Props) {
  const { role, page: pageValue } = await searchParams;
  const activeFilter = validFilters.includes(role as AdminUserFilter) ? (role as AdminUserFilter) : "all";
  const page = parseAdminPage(pageValue);
  const [{ items: users, total }, counts] = await Promise.all([getAdminUsersPage({ page, perPage: PER_PAGE, filter: activeFilter }), getAdminUserCounts()]);

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Kullanıcılar"
        description="Üyeleri, yöneticileri, rolleri ve hesap durumlarını yönet."
        actions={(
          <Link href="/admin/users/new" className="h-10 rounded-md border border-primary px-3 py-2 text-sm font-bold text-primary">
            Yeni Kullanıcı Ekle
          </Link>
        )}
      />

      <AdminPagination currentPage={page} perPage={PER_PAGE} total={total} basePath="/admin/users" itemName="kullanıcı" queryParams={activeFilter === "all" ? undefined : { role: activeFilter }} />
      <UsersTable users={users} counts={counts} activeFilter={activeFilter} />
    </div>
  );
}

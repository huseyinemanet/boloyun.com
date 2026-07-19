import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth";
import { getAdminCommentCounts, getAdminComments, type AdminCommentFilter } from "@/lib/db-comments";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { CommentsTable } from "./comments-table";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Yorumlar");

type Props = {
  searchParams: Promise<{ status?: string }>;
};

const validFilters: AdminCommentFilter[] = ["all", "pending", "approved", "spam", "trash"];

export default async function AdminCommentsPage({ searchParams }: Props) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeFilter = validFilters.includes(status as AdminCommentFilter) ? (status as AdminCommentFilter) : "all";
  const [allComments, counts] = await Promise.all([getAdminComments(500), getAdminCommentCounts()]);
  const comments = activeFilter === "all"
    ? allComments.filter((comment) => comment.status !== "trash")
    : allComments.filter((comment) => comment.status === activeFilter);

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Yorumlar" description="Yorumları durumlarına göre incele, toplu işlem uygula ve oyun sayfasına gönderilen yorumları yönet." />

      <CommentsTable comments={comments} counts={counts} activeFilter={activeFilter} />
    </div>
  );
}

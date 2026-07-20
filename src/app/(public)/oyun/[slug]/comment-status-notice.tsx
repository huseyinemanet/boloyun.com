"use client";

import { useSearchParams } from "next/navigation";

export function CommentStatusNotice() {
  const searchParams = useSearchParams();
  const status = normalizeCommentStatus(searchParams.get("comment") ?? undefined);
  if (!status) return null;
  return <CommentNotice status={status} />;
}

function CommentNotice({ status }: { status: "pending" | "approved" | "disabled" }) {
  const messages = {
    pending: "Yorumun alındı. Admin onayından sonra bu sayfada görünecek.",
    approved: "Yorumun yayınlandı.",
    disabled: "Bu demo oyun için yorum kaydı yapılamıyor.",
  };
  const styles = {
    pending: "bg-warning/10 text-warning",
    approved: "border border-success/30 bg-success/10 text-success",
    disabled: "bg-muted text-muted-foreground",
  };

  return (
    <p role="status" className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${styles[status]}`}>
      {messages[status]}
    </p>
  );
}

function normalizeCommentStatus(value: string | undefined) {
  if (value === "pending" || value === "approved" || value === "disabled") return value;
  return null;
}

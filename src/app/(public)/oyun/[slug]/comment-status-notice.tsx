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

  return (
    <p className="mt-4 rounded-md bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
      {messages[status]}
    </p>
  );
}

function normalizeCommentStatus(value: string | undefined) {
  if (value === "pending" || value === "approved" || value === "disabled") return value;
  return null;
}

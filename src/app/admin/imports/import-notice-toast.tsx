"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const notices: Record<string, string> = {
  saved: "Import kaydı güncellendi.",
  regenerated: "AI içeriği yeniden üretildi.",
  retried: "Import yeniden işlendi.",
  needs_fix: "Import düzeltmeye gönderildi.",
  rejected: "Import reddedildi.",
  reopened: "Import yeniden incelemeye açıldı.",
  approved: "Import yayınlandı.",
};

export function ImportNoticeToast({ notice, error, basePath = "/admin/imports" }: { notice?: string; error?: string; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!notice && !error) return;
    if (notice && notices[notice]) toast.success(notices[notice]);
    if (error) toast.error(error);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("notice");
    next.delete("error");
    const query = next.toString();
    router.replace(`${basePath}${query ? `?${query}` : ""}`, { scroll: false });
  }, [basePath, error, notice, router, searchParams]);
  return null;
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const notices: Record<string, string> = {
  created: "Kullanıcı eklendi.",
  updated: "Kullanıcı güncellendi.",
};

export function UserNoticeToast({ notice }: { notice?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!notice) return;

    const message = notices[notice];
    if (message) toast.success(message);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("notice");
    const query = nextParams.toString();
    router.replace(`/admin/users${query ? `?${query}` : ""}`, { scroll: false });
  }, [notice, router, searchParams]);

  return null;
}

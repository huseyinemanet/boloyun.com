"use client";

import { useEffect, useState } from "react";
import type { PublicAd } from "@/lib/db-ads";
import { cn } from "@/lib/utils";

type MeResponse = {
  profile: unknown | null;
};

export function PublicAdSlot({ ad, hideForMembers }: { ad: PublicAd; hideForMembers: boolean }) {
  const [canShow, setCanShow] = useState(!hideForMembers);

  useEffect(() => {
    if (!hideForMembers) return;

    const controller = new AbortController();

    async function checkProfile() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Profil okunamadi.");

        const data = await response.json() as MeResponse;
        setCanShow(!data.profile);
      } catch {
        if (!controller.signal.aborted) setCanShow(true);
      }
    }

    void checkProfile();
    return () => controller.abort();
  }, [hideForMembers]);

  if (!canShow) return null;

  return (
    <div
      className={cn(
        "min-h-10 overflow-hidden rounded-md text-center",
        ad.show_desktop === false && "md:hidden",
        ad.show_mobile === false && "hidden md:block",
      )}
      aria-label={ad.name}
      dangerouslySetInnerHTML={{ __html: ad.ad_code }}
    />
  );
}

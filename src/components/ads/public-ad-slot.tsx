"use client";

import { useEffect, useState } from "react";
import type { PublicAd } from "@/lib/db-ads";
import { publicAdSlotClassName } from "@/components/ads/ad-slot-style";

type MeResponse = {
  profile: unknown | null;
};

let profilePromise: Promise<boolean> | null = null;

export function MemberAwarePublicAdSlot({ ad }: { ad: PublicAd }) {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function checkProfile() {
      try {
        const hasProfile = await getSharedProfileState();
        if (controller.signal.aborted) return;
        setCanShow(!hasProfile);
      } catch {
        if (!controller.signal.aborted) setCanShow(true);
      }
    }

    void checkProfile();
    return () => controller.abort();
  }, []);

  if (!canShow) return null;

  return (
    <div
      className={publicAdSlotClassName(ad)}
      aria-label={ad.name}
      dangerouslySetInnerHTML={{ __html: ad.ad_code }}
    />
  );
}

async function getSharedProfileState() {
  profilePromise ??= fetch("/api/me", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Profil okunamadi.");
      const data = await response.json() as MeResponse;
      return Boolean(data.profile);
    })
    .catch((error) => {
      profilePromise = null;
      throw error;
    });

  return profilePromise;
}

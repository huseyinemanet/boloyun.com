"use client";

import type { PublicAd } from "@/lib/db-ads";
import { publicAdSlotClassName } from "@/components/ads/ad-slot-style";
import { useViewerState } from "@/components/auth/viewer-state-provider";

export function MemberAwarePublicAdSlot({ ad }: { ad: PublicAd }) {
  const { loaded, profile } = useViewerState();
  if (!loaded || profile) return null;

  return (
    <div
      className={publicAdSlotClassName(ad)}
      aria-label={ad.name}
      dangerouslySetInnerHTML={{ __html: ad.ad_code }}
    />
  );
}

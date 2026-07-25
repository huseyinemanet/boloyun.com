"use client";

import type { PublicAd } from "@/lib/db-ads";
import { publicAdSlotClassName } from "@/components/ads/ad-slot-style";
import { SandboxedAd } from "@/components/ads/sandboxed-ad";
import { useViewerState } from "@/components/auth/viewer-state-provider";

export function MemberAwarePublicAdSlot({ ad }: { ad: PublicAd }) {
  const { status } = useViewerState();
  if (status !== "anonymous") return null;

  return (
    <div className={publicAdSlotClassName(ad)} aria-label={ad.name}>
      <SandboxedAd ad={ad} />
    </div>
  );
}

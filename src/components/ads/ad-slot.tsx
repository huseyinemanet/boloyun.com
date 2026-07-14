import { unstable_rethrow } from "next/navigation";
import { getPublicAdForSlot, type PublicAd } from "@/lib/db-ads";
import { getPublicSettings } from "@/lib/db-settings";
import { publicAdSlotClassName } from "@/components/ads/ad-slot-style";

export async function AdSlot({ slotKey }: { slotKey: string }) {
  const data = await getSafeAdSlotData(slotKey);
  if (!data) return null;

  if (data.hideForMembers) {
    const { MemberAwarePublicAdSlot } = await import("@/components/ads/public-ad-slot");
    return <MemberAwarePublicAdSlot ad={data.ad} />;
  }

  return <StaticPublicAdSlot ad={data.ad} />;
}

async function getSafeAdSlotData(slotKey: string) {
  try {
    const [{ ads }, ad] = await Promise.all([getPublicSettings(), getPublicAdForSlot(slotKey)]);
    if (!ads.enabled || !ad) return null;
    return { ad, hideForMembers: !ads.showToMembers };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[ads] slot could not be rendered", { slotKey, ...toLogError(error) });
    return null;
  }
}

function toLogError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

function StaticPublicAdSlot({ ad }: { ad: PublicAd }) {
  return (
    <div
      className={publicAdSlotClassName(ad)}
      aria-label={ad.name}
      dangerouslySetInnerHTML={{ __html: ad.ad_code }}
    />
  );
}

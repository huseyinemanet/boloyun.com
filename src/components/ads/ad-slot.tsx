import { unstable_rethrow } from "next/navigation";
import { PublicAdSlot } from "@/components/ads/public-ad-slot";
import { getPublicAdForSlot } from "@/lib/db-ads";
import { getPublicSettings } from "@/lib/db-settings";

export async function AdSlot({ slotKey }: { slotKey: string }) {
  const data = await getSafeAdSlotData(slotKey);
  if (!data) return null;

  return <PublicAdSlot ad={data.ad} hideForMembers={data.hideForMembers} />;
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

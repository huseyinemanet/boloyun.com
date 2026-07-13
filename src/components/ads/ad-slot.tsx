import { unstable_rethrow } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getPublicAdForSlot } from "@/lib/db-ads";
import { getPublicSettings } from "@/lib/db-settings";
import { cn } from "@/lib/utils";

export async function AdSlot({ slotKey }: { slotKey: string }) {
  const data = await getSafeAdSlotData(slotKey);
  if (!data) return null;

  const { ad } = data;
  return <div
    className={cn(
      "min-h-10 overflow-hidden rounded-md text-center",
      ad.show_desktop === false && "md:hidden",
      ad.show_mobile === false && "hidden md:block",
    )}
    aria-label={ad.name}
    dangerouslySetInnerHTML={{ __html: ad.ad_code }}
  />;
}

async function getSafeAdSlotData(slotKey: string) {
  try {
    const [{ ads }, profile, ad] = await Promise.all([getPublicSettings(), getCurrentProfile(), getPublicAdForSlot(slotKey)]);
    if (!ads.enabled || (profile && !ads.showToMembers) || !ad) return null;
    return { ad };
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

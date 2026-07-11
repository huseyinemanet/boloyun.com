import { getCurrentProfile } from "@/lib/auth";
import { getPublicAdForSlot } from "@/lib/db-ads";
import { getPublicSettings } from "@/lib/db-settings";
import { cn } from "@/lib/utils";

export async function AdSlot({ slotKey }: { slotKey: string }) {
  const [{ ads }, profile, ad] = await Promise.all([getPublicSettings(), getCurrentProfile(), getPublicAdForSlot(slotKey)]);
  if (!ads.enabled || (profile && !ads.showToMembers) || !ad) return null;
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

import type { PublicAd } from "@/lib/db-ads";
import { cn } from "@/lib/utils";

export function publicAdSlotClassName(ad: PublicAd) {
  return cn(
    "min-h-10 overflow-hidden rounded-md text-center",
    ad.show_desktop === false && "md:hidden",
    ad.show_mobile === false && "hidden md:block",
  );
}

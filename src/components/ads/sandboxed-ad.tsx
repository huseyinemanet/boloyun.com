import type { PublicAd } from "@/lib/db-ads";
import { buildSandboxedAdDocument } from "@/lib/ads/sandbox";

export function SandboxedAd({ ad }: { ad: PublicAd }) {
  return (
    <iframe
      title={ad.name}
      srcDoc={buildSandboxedAdDocument(ad.ad_code)}
      sandbox="allow-scripts allow-popups"
      referrerPolicy="no-referrer"
      loading="lazy"
      className="h-[250px] w-full border-0 bg-transparent"
    />
  );
}

import { getPublicAd } from "@public/lib/data";

export async function PublicAdSlot({ slotKey }: { slotKey: string }) {
  const ad = await getPublicAd(slotKey);
  if (!ad) return null;

  return (
    <aside
      className="overflow-hidden rounded-md border border-border bg-card p-2"
      data-ad-slot={slotKey}
      dangerouslySetInnerHTML={{ __html: ad.code }}
    />
  );
}

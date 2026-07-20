import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { IconBadgeDollarFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBadgeDollarFillDuo18";
import { IconCircleInfoFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleInfoFillDuo18";
import { IconCodeActionFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCodeActionFillDuo18";
import { IconFileContentFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconFileContentFillDuo18";
import { IconPromotionFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPromotionFillDuo18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminAdManagerData, type AdRow } from "@/lib/db-ads";
import { requireAdmin } from "@/lib/auth";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { AdForm, AdSlotForm } from "./ads-forms";
import { AdsTable } from "./ads-table";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Reklam Yönetimi");

type AdminAdsPageProps = {
  searchParams: Promise<{
    slot?: string;
    ad?: string;
  }>;
};

export default async function AdminAdsPage({ searchParams }: AdminAdsPageProps) {
  await requireAdmin();
  const [{ slot: slotId, ad: adId }, data] = await Promise.all([searchParams, getAdminAdManagerData()]);
  const selectedSlot = data.slots.find((slot) => slot.id === slotId) ?? data.slots[0];
  const selectedAd = data.ads.find((ad) => ad.id === adId);
  const adsBySlot = groupAdsBySlot(data.ads);
  const newAdHref = selectedSlot ? `/admin/ads?slot=${selectedSlot.id}#ad-form` : "/admin/ads#ad-form";

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Reklam Yönetimi" description="Slot bazlı reklam kodlarını yönet. Public sayfalardaki reklam alanları bu anahtarlarla eşleşir." />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-md border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-3">
            <div>
              <h2 className="font-bold">Reklam slotları</h2>
              <p className="mt-1 text-xs text-muted-foreground">{data.slots.length} slot</p>
            </div>
            <Button asChild variant="outline" size="lg" className="font-semibold">
              <Link href={newAdHref}>
                <PlusIcon className="size-4" aria-hidden="true" />
                Yeni reklam
              </Link>
            </Button>
          </div>

          <Table className="min-w-[820px] table-fixed">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-64">
                  <span className="inline-flex items-center justify-center" title="Slot" aria-label="Slot">
                    <IconPromotionFillDuo18 className="size-5" />
                  </span>
                </TableHead>
                <TableHead>
                  <span className="inline-flex items-center justify-center" title="Açıklama" aria-label="Açıklama">
                    <IconCircleInfoFillDuo18 className="size-5" />
                  </span>
                </TableHead>
                <TableHead className="w-32">
                  <span className="inline-flex items-center justify-center" title="Sayfa" aria-label="Sayfa">
                    <IconFileContentFillDuo18 className="size-5" />
                  </span>
                </TableHead>
                <TableHead className="w-36">
                  <span className="inline-flex items-center justify-center" title="Reklam" aria-label="Reklam">
                    <IconBadgeDollarFillDuo18 className="size-5" />
                  </span>
                </TableHead>
                <TableHead className="w-36 text-right">
                  <span className="inline-flex items-center justify-center" title="Aksiyon" aria-label="Aksiyon">
                    <IconCodeActionFillDuo18 className="size-5" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {data.slots.map((slot) => {
                  const slotAds = adsBySlot.get(slot.id) ?? [];
                  return (
                    <TableRow key={slot.id}>
                      <TableCell className="whitespace-normal">
                        <Link href={`/admin/ads?slot=${slot.id}`} className="font-semibold text-primary hover:underline">
                          {slot.name}
                        </Link>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{slot.key}</p>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{slot.description || "Açıklama yok"}</TableCell>
                      <TableCell>{slot.page_type || "-"}</TableCell>
                      <TableCell>
                        <p className="font-semibold">{slotAds.length} reklam</p>
                        <p className="mt-1 text-xs text-muted-foreground">{slotAds.filter((ad) => ad.is_active !== false).length} aktif</p>
                      </TableCell>
                      <TableCell>
                        <ButtonGroup
                          className="ml-auto"
                          aria-label={`${slot.name} reklam slotu aksiyonları`}
                        >
                          <Button asChild size="icon-sm" variant="outline">
                            <Link
                              href={`/admin/ads?slot=${slot.id}`}
                              aria-label={`${slot.name} reklam slotunu düzenle`}
                              title="Slotu düzenle"
                            >
                              <PencilIcon />
                            </Link>
                          </Button>
                          <ButtonGroupSeparator />
                          <Button asChild size="icon-sm" variant="outline">
                            <Link
                              href={`/admin/ads?slot=${slot.id}#ad-form`}
                              aria-label={`${slot.name} slotuna reklam ekle`}
                              title="Reklam ekle"
                            >
                              <PlusIcon />
                            </Link>
                          </Button>
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border border-border bg-card p-4">
            <h2 className="font-bold">Slot düzenle</h2>
            <p className="mt-1 text-xs text-muted-foreground">Slot anahtarı public componentlerde kullanılan `slotKey` ile aynı olmalı.</p>
            {selectedSlot ? <AdSlotForm slot={selectedSlot} /> : null}
          </section>

          <section id="ad-form" className="scroll-mt-24 rounded-md border border-border bg-card p-4">
            <h2 className="font-bold">{selectedAd ? "Reklam düzenle" : "Yeni reklam"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Reklam kodu sadece admin tarafından girilir. Tarih boşsa sürekli çalışır.</p>
            <AdForm slots={data.slots} selectedSlot={selectedSlot} ad={selectedAd} />
          </section>
        </aside>
      </div>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border bg-muted/40 p-3">
          <h2 className="font-bold">Reklam listesi</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.ads.length > 0 ? `${data.ads.length.toLocaleString("tr-TR")} reklam` : "Henüz reklam eklenmedi."}
          </p>
        </div>
        <AdsTable ads={data.ads} slots={data.slots} />
      </section>
    </div>
  );
}

function groupAdsBySlot(ads: AdRow[]) {
  const map = new Map<string, AdRow[]>();
  for (const ad of ads) {
    const current = map.get(ad.slot_id) ?? [];
    current.push(ad);
    map.set(ad.slot_id, current);
  }
  return map;
}

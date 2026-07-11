import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAdminAdManagerData, type AdRow, type AdSlotRow } from "@/lib/db-ads";
import { saveAdAction, saveAdSlotAction } from "./actions";
import { AdsTable } from "./ads-table";

export const dynamic = "force-dynamic";

type AdminAdsPageProps = {
  searchParams: Promise<{
    slot?: string;
    ad?: string;
  }>;
};

export default async function AdminAdsPage({ searchParams }: AdminAdsPageProps) {
  const [{ slot: slotId, ad: adId }, data] = await Promise.all([searchParams, getAdminAdManagerData()]);
  const selectedSlot = data.slots.find((slot) => slot.id === slotId) ?? data.slots[0];
  const selectedAd = data.ads.find((ad) => ad.id === adId);
  const adsBySlot = groupAdsBySlot(data.ads);

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
              <Link href="/admin/ads">Yeni reklam</Link>
            </Button>
          </div>

          <Table className="min-w-[820px] table-fixed">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-64">Slot</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="w-32">Sayfa</TableHead>
                <TableHead className="w-36">Reklam</TableHead>
                <TableHead className="w-36 text-right">Aksiyon</TableHead>
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

          <section id="ad-form" className="rounded-md border border-border bg-card p-4">
            <h2 className="font-bold">{selectedAd ? "Reklam düzenle" : "Yeni reklam"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Reklam kodu sadece admin tarafından girilir. Tarih boşsa sürekli çalışır.</p>
            <AdForm slots={data.slots} selectedSlot={selectedSlot} ad={selectedAd} />
          </section>
        </aside>
      </div>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border bg-muted/40 p-3">
          <h2 className="font-bold">Reklam listesi</h2>
          <p className="mt-1 text-xs text-muted-foreground">{data.ads.length} reklam</p>
        </div>
        <AdsTable ads={data.ads} slots={data.slots} />
      </section>
    </div>
  );
}

function AdSlotForm({ slot }: { slot: AdSlotRow }) {
  return (
    <form action={saveAdSlotAction} className="mt-4 grid gap-3">
      <input type="hidden" name="id" value={slot.id} />
      <Field label="Slot adı" name="name" defaultValue={slot.name} />
      <Field label="Slot key" name="key" defaultValue={slot.key} />
      <TextArea label="Açıklama" name="description" defaultValue={slot.description ?? ""} rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sayfa tipi" name="page_type" defaultValue={slot.page_type ?? ""} />
        <Field label="Pozisyon" name="position" defaultValue={slot.position ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <Checkbox name="is_active" defaultChecked={slot.is_active !== false} />
        Aktif
      </label>
      <Button className="h-10 text-sm font-bold">Slotu Güncelle</Button>
    </form>
  );
}

function AdForm({ slots, selectedSlot, ad }: { slots: AdSlotRow[]; selectedSlot?: AdSlotRow; ad?: AdRow }) {
  return (
    <form action={saveAdAction} className="mt-4 grid gap-3">
      <input type="hidden" name="id" value={ad?.id ?? ""} />
      <label className="block text-sm font-bold">
        Slot
        <Select name="slot_id" defaultValue={ad?.slot_id ?? selectedSlot?.id ?? ""}>
          <SelectTrigger className="mt-1 h-10 w-full">
            <SelectValue placeholder="Slot seç" />
          </SelectTrigger>
          <SelectContent>
            {slots.map((slot) => (
              <SelectItem key={slot.id} value={slot.id}>
                {slot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <Field label="Reklam adı" name="name" defaultValue={ad?.name ?? ""} />
      <TextArea label="Reklam kodu" name="ad_code" defaultValue={ad?.ad_code ?? ""} rows={6} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Öncelik" name="priority" defaultValue={String(ad?.priority ?? 0)} />
        <div className="grid gap-2 text-sm font-bold">
          Gösterim
          <label className="flex items-center gap-2 text-xs font-bold">
            <Checkbox name="show_desktop" defaultChecked={ad?.show_desktop !== false} />
            Desktop
          </label>
          <label className="flex items-center gap-2 text-xs font-bold">
            <Checkbox name="show_mobile" defaultChecked={ad?.show_mobile !== false} />
            Mobil
          </label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Başlangıç" name="start_at" defaultValue={toDateTimeLocal(ad?.start_at)} type="datetime-local" />
        <Field label="Bitiş" name="end_at" defaultValue={toDateTimeLocal(ad?.end_at)} type="datetime-local" />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <Checkbox name="is_active" defaultChecked={ad?.is_active !== false} />
        Aktif
      </label>
      <Button className="h-10 text-sm font-bold">{ad ? "Reklamı Güncelle" : "Reklam Ekle"}</Button>
    </form>
  );
}

function Field({ label, name, defaultValue, type = "text" }: { label: string; name: string; defaultValue: string; type?: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <Input name={name} type={type} defaultValue={defaultValue} className="mt-1 h-10" />
    </label>
  );
}

function TextArea({ label, name, defaultValue, rows }: { label: string; name: string; defaultValue: string; rows: number }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <Textarea name={name} defaultValue={defaultValue} rows={rows} className="mt-1 resize-y" />
    </label>
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

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

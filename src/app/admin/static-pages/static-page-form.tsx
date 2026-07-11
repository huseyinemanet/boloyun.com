import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StaticPageRow } from "@/lib/db-static-pages";
import { staticPageEditorContent } from "@/lib/db-static-pages";
import { absoluteUrl } from "@/lib/seo/metadata";
import { saveStaticPageAction } from "./actions";

export function StaticPageForm({ page }: { page?: StaticPageRow }) {
  return (
    <form action={saveStaticPageAction} className="space-y-4">
      <input type="hidden" name="id" value={page?.id ?? ""} />
      <section className="space-y-4 rounded-md border border-border bg-card p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Başlık" name="title" value={page?.title ?? ""} required placeholder="Örn. Çocuk Güvenliği" />
          <Field label="Slug" name="slug" value={page?.slug ?? ""} required placeholder="cocuk-guvenligi" />
        </div>
        <label className="block text-sm font-bold">
          İçerik
          <Textarea name="content" defaultValue={page ? staticPageEditorContent(page) : ""} rows={22} required className="mt-1 resize-y font-mono text-xs leading-6" placeholder={"Bölüm başlığı\nİlk paragraf\nİkinci paragraf\n\n---\n\nYeni bölüm başlığı\nParagraf"} />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">Her bloğun ilk satırı bölüm başlığıdır. Bölümleri yalnızca --- satırıyla ayırın.</span>
        </label>
      </section>

      <section className="space-y-4 rounded-md border border-border bg-card p-4 md:p-5">
        <div><h2 className="font-bold">SEO ve yayın ayarları</h2><p className="mt-1 text-xs text-muted-foreground">Arama sonucu görünümünü ve sayfanın yayın durumunu belirleyin.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SEO başlığı" name="seo_title" value={page?.seo_title ?? ""} />
          <Field label="Open Graph görsel URL" name="og_image_url" value={page?.og_image_url ?? ""} />
        </div>
        <label className="block text-sm font-bold">SEO açıklaması<Textarea name="seo_description" defaultValue={page?.seo_description ?? ""} rows={3} className="mt-1 resize-y" /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-bold">Durum<Select name="status" defaultValue={page?.status ?? "draft"}><SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="published">Yayında</SelectItem><SelectItem value="draft">Taslak</SelectItem></SelectContent></Select></label>
          <label className="flex items-center gap-2 self-end rounded-md border border-border px-3 py-2.5 text-sm font-bold"><input type="checkbox" name="is_indexable" defaultChecked={page?.is_indexable ?? true} /> Arama motorlarında indekslenebilir</label>
        </div>
        {page ? <div className="rounded-md border border-border bg-muted/30 p-3 text-xs"><p className="font-bold">Canonical URL</p><p className="mt-1 break-all text-muted-foreground">{absoluteUrl(`/sayfa/${page.slug}`)}</p></div> : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline"><Link href="/admin/static-pages">İptal</Link></Button>
        <div className="flex items-center gap-2">
          {page?.status === "published" ? <Button asChild variant="outline"><Link href={`/sayfa/${page.slug}`} target="_blank">Sayfayı Görüntüle <ExternalLinkIcon /></Link></Button> : null}
          <Button className="font-bold">{page ? "Sayfayı Güncelle" : "Sayfayı Oluştur"}</Button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, name, value, required = false, placeholder }: { label: string; name: string; value: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-sm font-bold">{label}<Input name={name} defaultValue={value} required={required} placeholder={placeholder} className="mt-1" /></label>;
}

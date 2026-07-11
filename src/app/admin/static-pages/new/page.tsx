import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveStaticPageAction } from "../actions";

export default function NewStaticPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <AdminPageHeader title="Yeni Sayfa Ekle" description="Yeni bir bilgi veya politika sayfası oluşturun." />
      <form action={saveStaticPageAction} className="space-y-4">
        <input type="hidden" name="id" value="" />
        <section className="space-y-4 rounded-md border border-border bg-card p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Başlık" name="title" required placeholder="Örn. Çocuk Güvenliği" />
            <Field label="Slug" name="slug" required placeholder="cocuk-guvenligi" />
          </div>
          <label className="block text-sm font-bold">
            İçerik
            <Textarea name="content" rows={22} required className="mt-1 resize-y font-mono text-xs leading-6" placeholder={"Bölüm başlığı\nİlk paragraf\nİkinci paragraf\n\n---\n\nYeni bölüm başlığı\nParagraf"} />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Her bloğun ilk satırı bölüm başlığıdır. Bölümleri yalnızca --- satırıyla ayırın.</span>
          </label>
        </section>

        <section className="space-y-4 rounded-md border border-border bg-card p-4 md:p-5">
          <div><h2 className="font-bold">SEO ve yayın ayarları</h2><p className="mt-1 text-xs text-muted-foreground">Arama sonucu görünümünü ve sayfanın yayın durumunu belirleyin.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="SEO başlığı" name="seo_title" />
            <Field label="Open Graph görsel URL" name="og_image_url" />
          </div>
          <label className="block text-sm font-bold">SEO açıklaması<Textarea name="seo_description" rows={3} className="mt-1 resize-y" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold">
              Durum
              <select name="status" defaultValue="draft" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
                <option value="published">Yayında</option>
                <option value="draft">Taslak</option>
              </select>
            </label>
            <label className="flex items-center gap-2 self-end rounded-md border border-border px-3 py-2.5 text-sm font-bold"><input type="checkbox" name="is_indexable" defaultChecked /> Arama motorlarında indekslenebilir</label>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline"><Link href="/admin/static-pages">İptal</Link></Button>
          <Button className="font-bold">Sayfayı Oluştur</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, required = false, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-sm font-bold">{label}<Input name={name} required={required} placeholder={placeholder} className="mt-1" /></label>;
}

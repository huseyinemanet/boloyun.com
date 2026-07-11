import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination, parseAdminPage } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAdminTagById, getAdminTagsPage } from "@/lib/db-tags";
import { saveTagAction } from "./actions";

export const dynamic = "force-dynamic";
const PER_PAGE = 50;

type Props = { searchParams: Promise<{ page?: string; q?: string; edit?: string }> };

export default async function AdminTagsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseAdminPage(params.page);
  const query = params.q?.trim() ?? "";
  const [{ items, total }, editingTag] = await Promise.all([
    getAdminTagsPage({ page, perPage: PER_PAGE, query }),
    params.edit ? getAdminTagById(params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Etiketler" description="Etiketleri düzenle; yalnız kaliteli ve yeterli oyunu olan sayfaları indekslemeye aç." />
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form action={saveTagAction} className="h-fit space-y-3 rounded-md border border-border bg-card p-4">
          <input type="hidden" name="id" value={editingTag?.id ?? ""} />
          <h2 className="font-bold">{editingTag ? "Etiketi düzenle" : "Yeni etiket"}</h2>
          <Field label="Ad" name="name" defaultValue={editingTag?.name ?? ""} required />
          <Field label="Slug" name="slug" defaultValue={editingTag?.slug ?? ""} required />
          <label className="block text-sm font-bold">Durum<Select name="status" defaultValue={editingTag?.status ?? "active"}><SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Aktif</SelectItem><SelectItem value="inactive">Pasif</SelectItem></SelectContent></Select></label>
          <Area label="Giriş metni" name="description" defaultValue={editingTag?.description ?? ""} rows={4} />
          <Field label="SEO başlığı" name="seo_title" defaultValue={editingTag?.seo_title ?? ""} />
          <Area label="SEO açıklaması" name="seo_description" defaultValue={editingTag?.seo_description ?? ""} rows={3} />
          <Field label="Open Graph görsel URL" name="og_image_url" defaultValue={editingTag?.og_image_url ?? ""} />
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_indexable" defaultChecked={editingTag?.is_indexable ?? false} /> İndekslenebilir</label>
          {editingTag ? <p className={`rounded-md p-3 text-xs font-bold ${(editingTag.publishedGameCount ?? 0) >= 5 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{editingTag.publishedGameCount} yayınlanmış oyun. İndeksleme için en az 5 oyun gerekir.</p> : null}
          <Button className="w-full">Kaydet</Button>
        </form>

        <div className="space-y-3">
          <form className="flex gap-2" action="/admin/tags"><Input name="q" defaultValue={query} placeholder="Etiket ara..." /><Button variant="outline">Ara</Button></form>
          <AdminPagination currentPage={page} perPage={PER_PAGE} total={total} basePath="/admin/tags" itemName="etiket" queryParams={query ? { q: query } : undefined} />
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <Table><TableHeader><TableRow><TableHead>Etiket</TableHead><TableHead className="w-28">Oyun</TableHead><TableHead className="w-28">SEO</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
              <TableBody>{items.map((tag) => <TableRow key={tag.id}><TableCell><p className="font-semibold">{tag.name}</p><p className="text-xs text-muted-foreground">/{tag.slug}</p></TableCell><TableCell>{tag.publishedGameCount}</TableCell><TableCell>{tag.effectiveIndexable ? "İndekste" : "Kapalı"}</TableCell><TableCell><Button asChild size="sm" variant="outline"><Link href={`/admin/tags?edit=${tag.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>Düzenle</Link></Button></TableCell></TableRow>)}</TableBody>
            </Table>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, required = false }: { label: string; name: string; defaultValue: string; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<Input name={name} defaultValue={defaultValue} required={required} className="mt-1" /></label>;
}

function Area({ label, name, defaultValue, rows }: { label: string; name: string; defaultValue: string; rows: number }) {
  return <label className="block text-sm font-bold">{label}<Textarea name={name} defaultValue={defaultValue} rows={rows} className="mt-1" /></label>;
}

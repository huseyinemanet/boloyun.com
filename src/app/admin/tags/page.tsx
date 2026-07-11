import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination, parseAdminPage } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminTagById, getAdminTagsPage } from "@/lib/db-tags";
import { TagForm } from "./tag-form";

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
        <TagForm tag={editingTag} />

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

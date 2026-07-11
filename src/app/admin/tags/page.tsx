import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination, parseAdminPage } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminTagById, getAdminTagsPage } from "@/lib/db-tags";
import { TagForm } from "./tag-form";
import { TagsSearchForm } from "./tags-search-form";

export const dynamic = "force-dynamic";
const PER_PAGE = 50;

type Props = { searchParams: Promise<{ page?: string; q?: string; edit?: string }> };

export default async function AdminTagsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseAdminPage(params.page);
  const query = params.q?.trim() ?? "";
  if (params.q !== undefined && !query) redirect(cleanTagsHref({ page: params.page, edit: params.edit }));

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
          <TagsSearchForm query={query} />
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

function cleanTagsHref({ page, edit }: { page?: string; edit?: string }) {
  const params = new URLSearchParams();
  if (page && page !== "1") params.set("page", page);
  if (edit) params.set("edit", edit);
  const suffix = params.toString();
  return suffix ? `/admin/tags?${suffix}` : "/admin/tags";
}

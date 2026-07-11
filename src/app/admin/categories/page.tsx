import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryIcon } from "@/components/icons/category-icon";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminCategories } from "@/lib/db-categories";
import { CategoryForm } from "./category-form";

export const dynamic = "force-dynamic";

type AdminCategoriesPageProps = {
  searchParams: Promise<{
    edit?: string;
  }>;
};

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const [{ edit }, categories] = await Promise.all([searchParams, getAdminCategories()]);
  const editingCategory = categories.find((category) => category.id === edit);

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Kategoriler" description="Kategorileri kompakt listeden yönet, sadece seçtiğin kategoriyi düzenle." />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="h-fit rounded-md border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">{editingCategory ? "Kategori düzenle" : "Yeni kategori"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {editingCategory ? "Seçili kategorinin bilgilerini güncelle." : "Yeni kategori oluştur."}
              </p>
            </div>
            {editingCategory ? (
              <Link href="/admin/categories" className="rounded-md border border-border px-3 py-2 text-xs font-bold">
                Yeni
              </Link>
            ) : null}
          </div>
          <CategoryForm key={editingCategory?.id ?? "new"} category={editingCategory} />
        </section>

        <section className="overflow-hidden rounded-md border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-3">
            <div>
              <h2 className="font-bold">Kategori listesi</h2>
              <p className="mt-1 text-xs text-muted-foreground">{categories.length} kategori</p>
            </div>
          </div>

          <Table className="min-w-[680px] table-fixed">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-16">İkon</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead className="w-48">Slug</TableHead>
                <TableHead className="w-28 text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <CategoryIcon category={category} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Link href={`/admin/categories?edit=${category.id}`} className="font-semibold text-primary hover:underline">
                        {category.name}
                      </Link>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{category.description || "Açıklama yok"}</p>
                    </TableCell>
                    <TableCell className="truncate text-muted-foreground">{category.slug}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button asChild size="sm" variant="outline" className="font-semibold">
                          <Link href={`/admin/categories?edit=${category.id}`}>Düzenle</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center font-medium text-muted-foreground">
                      Henüz kategori yok.
                    </TableCell>
                  </TableRow>
                ) : null}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}

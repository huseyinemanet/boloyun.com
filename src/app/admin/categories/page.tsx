import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminCategories } from "@/lib/db-categories";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { CategoryManager } from "./category-manager";

export const dynamic = "force-dynamic";
export const metadata = adminPageMetadata("Kategoriler");

type AdminCategoriesPageProps = {
  searchParams: Promise<{
    edit?: string;
  }>;
};

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const [{ edit }, categories] = await Promise.all([searchParams, getAdminCategories()]);

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Kategoriler" description="Kategorileri düzenle ve sürükleyerek sitedeki gösterim sırasını belirle." />
      <CategoryManager key={edit ?? "new"} categories={categories} initialEditingId={edit} />
    </div>
  );
}

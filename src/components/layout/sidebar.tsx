import Link from "next/link";
import { CategoryIcon } from "@/components/icons/category-icon";
import { SidebarScroll } from "@/components/layout/sidebar-scroll";
import { getPublicCategories } from "@/lib/db-categories";

export async function Sidebar() {
  const categories = await getPublicCategories(160);

  return (
    <aside className="md:sticky md:top-20 md:h-[calc(100vh-6rem)]">
      <SidebarScroll>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/kategori/${category.slug}`}
            className="group mb-0 flex min-w-fit items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal text-sidebar-foreground transition hover:bg-sidebar-accent md:min-w-0"
            title={category.name}
          >
            <CategoryIcon category={category} />
            <span className="truncate">{category.name}</span>
          </Link>
        ))}
      </SidebarScroll>
    </aside>
  );
}

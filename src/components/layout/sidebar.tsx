import { SidebarCategoryLink } from "@/components/layout/sidebar-category-link";
import { SidebarScroll } from "@/components/layout/sidebar-scroll";
import { SidebarActiveState } from "@/components/layout/sidebar-active-state";
import type { PublicNavCategory } from "@/lib/db-public-shell";

export function Sidebar({ categories }: { categories: PublicNavCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <aside className="md:sticky md:top-20 md:h-[calc(100vh-6rem)]">
      <SidebarScroll categories={categories}>
        <SidebarActiveState />
        {categories.map((category) => (
          <SidebarCategoryLink key={category.id} category={category} />
        ))}
      </SidebarScroll>
    </aside>
  );
}

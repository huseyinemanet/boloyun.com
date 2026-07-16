import { SidebarCategoryLink } from "@/components/layout/sidebar-category-link";
import { SidebarScroll } from "@/components/layout/sidebar-scroll";
import { getSidebarCategories } from "@/lib/db-categories";
import { SidebarActiveState } from "@/components/layout/sidebar-active-state";

export async function Sidebar() {
  const categories = await getSidebarCategories();

  return (
    <aside className="md:sticky md:top-20 md:h-[calc(100vh-6rem)]">
      <SidebarScroll>
        <SidebarActiveState />
        {categories.map((category) => (
          <SidebarCategoryLink key={category.id} category={category} />
        ))}
      </SidebarScroll>
    </aside>
  );
}

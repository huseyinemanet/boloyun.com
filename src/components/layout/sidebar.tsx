import { SidebarCategoryLink } from "@/components/layout/sidebar-category-link";
import { SidebarScroll } from "@/components/layout/sidebar-scroll";
import { getPublicCategories } from "@/lib/db-categories";

export async function Sidebar() {
  const categories = await getPublicCategories(160);

  return (
    <aside className="md:sticky md:top-20 md:h-[calc(100vh-6rem)]">
      <SidebarScroll>
        {categories.map((category) => (
          <SidebarCategoryLink key={category.id} category={category} />
        ))}
      </SidebarScroll>
    </aside>
  );
}

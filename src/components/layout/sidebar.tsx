import { SidebarCategoryLink } from "@/components/layout/sidebar-category-link";
import { SidebarScroll } from "@/components/layout/sidebar-scroll";
import { getSidebarCategories } from "@/lib/db-categories";
import { SidebarActiveState } from "@/components/layout/sidebar-active-state";
import { SoundLink } from "@/components/audio/sound-link";

export async function Sidebar() {
  const categories = await getSidebarCategories();

  return (
    <aside className="md:sticky md:top-20 md:h-[calc(100vh-6rem)]">
      <SidebarScroll>
        <SidebarActiveState />
        {categories.map((category) => (
          <SidebarCategoryLink key={category.id} category={category} />
        ))}
        <SoundLink href="/kategoriler" className="mb-0 flex min-w-fit items-center rounded-md px-2 py-2 text-sm font-semibold text-primary hover:bg-sidebar-accent md:min-w-0">
          Tüm Kategoriler
        </SoundLink>
      </SidebarScroll>
    </aside>
  );
}

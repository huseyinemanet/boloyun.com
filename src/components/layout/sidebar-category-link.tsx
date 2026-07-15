import { CategoryIcon } from "@/components/icons/category-icon";
import type { PublicNavCategory } from "@/lib/db-public-shell";
import { SoundLink } from "@/components/audio/sound-link";

export function SidebarCategoryLink({ category }: { category: PublicNavCategory }) {
  const href = `/kategori/${category.slug}`;

  return (
    <SoundLink
      href={href}
      data-sidebar-path={href}
      data-active="false"
      className="group mb-0 flex min-w-fit items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal text-sidebar-foreground transition hover:bg-sidebar-accent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/90 md:min-w-0"
      title={category.name}
    >
      <CategoryIcon
        category={category}
        className="group-data-[active=true]:bg-primary-foreground/15 group-data-[active=true]:text-primary-foreground group-data-[active=true]:group-hover:bg-primary-foreground/20"
      />
      <span className="truncate">{category.name}</span>
    </SoundLink>
  );
}

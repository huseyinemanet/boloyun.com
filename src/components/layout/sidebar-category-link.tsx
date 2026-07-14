"use client";

import { usePathname } from "next/navigation";
import { CategoryIcon } from "@/components/icons/category-icon";
import type { CategoryRow } from "@/lib/db-categories";
import { cn } from "@/lib/utils";
import { SoundLink } from "@/components/audio/sound-link";

export function SidebarCategoryLink({ category }: { category: CategoryRow }) {
  const pathname = usePathname();
  const href = `/kategori/${category.slug}`;
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <SoundLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group mb-0 flex min-w-fit items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal text-sidebar-foreground transition hover:bg-sidebar-accent md:min-w-0",
        active && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      title={category.name}
    >
      <CategoryIcon
        category={category}
        className={active ? "bg-primary-foreground/15 text-primary-foreground group-hover:bg-primary-foreground/20" : undefined}
      />
      <span className="truncate">{category.name}</span>
    </SoundLink>
  );
}

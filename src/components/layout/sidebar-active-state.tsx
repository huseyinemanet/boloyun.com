"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SidebarActiveState() {
  const pathname = usePathname();

  useEffect(() => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-sidebar-path]")) {
      const href = link.dataset.sidebarPath ?? "";
      const active = pathname === href || pathname.startsWith(`${href}/`);
      link.dataset.active = String(active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }, [pathname]);

  return null;
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";
import type { PublicNavCategory } from "@/lib/db-public-shell";

type FadeEdges = {
  top: boolean;
  bottom: boolean;
};

export function SidebarScroll({ children, categories }: { children: ReactNode; categories: PublicNavCategory[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { playClickSound } = useClickSound();
  const navRef = useRef<HTMLElement>(null);
  const [mobileViewport, setMobileViewport] = useState(false);
  const [fadeEdges, setFadeEdges] = useState<FadeEdges>({ top: false, bottom: false });
  const activeCategoryHref = categories
    .map((category) => `/kategori/${category.slug}`)
    .find((href) => pathname === href || pathname.startsWith(`${href}/`)) ?? "";

  const updateFadeEdges = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const nextEdges = {
      top: nav.scrollTop > 2,
      bottom: nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2,
    };

    setFadeEdges((current) => (
      current.top === nextEdges.top && current.bottom === nextEdges.bottom ? current : nextEdges
    ));
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setMobileViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (mobileViewport) return;

    const nav = navRef.current;
    if (!nav) return;

    updateFadeEdges();
    const resizeObserver = new ResizeObserver(updateFadeEdges);
    resizeObserver.observe(nav);

    return () => resizeObserver.disconnect();
  }, [mobileViewport, updateFadeEdges]);

  function navigateFromMobileMenu(event: ChangeEvent<HTMLSelectElement>) {
    const href = event.target.value;
    if (!href || href === activeCategoryHref) return;

    playClickSound();
    router.push(href);
  }

  return (
    <div className="relative h-11 md:h-full">
      {mobileViewport ? (
        <div>
          <label htmlFor="mobile-category-menu" className="sr-only">
            Oyun kategorisi seç
          </label>
          <select
            id="mobile-category-menu"
            value={activeCategoryHref}
            onChange={navigateFromMobileMenu}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base font-semibold text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Oyun kategorisi seç"
          >
            <option value="" disabled>Oyun kategorisi seç</option>
            {categories.map((category) => (
              <option key={category.id} value={`/kategori/${category.slug}`}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <nav
            ref={navRef}
            onScroll={updateFadeEdges}
            className="hidden h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] md:block [&::-webkit-scrollbar]:hidden"
            aria-label="Oyun kategorileri"
          >
            {children}
          </nav>

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-10 bg-gradient-to-b from-background via-background/85 to-transparent transition-opacity duration-200 md:block ${fadeEdges.top ? "opacity-100" : "opacity-0"}`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-10 bg-gradient-to-t from-background via-background/85 to-transparent transition-opacity duration-200 md:block ${fadeEdges.bottom ? "opacity-100" : "opacity-0"}`}
          />
        </>
      )}
    </div>
  );
}

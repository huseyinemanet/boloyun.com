"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type FadeEdges = {
  top: boolean;
  bottom: boolean;
};

export function SidebarScroll({ children }: { children: ReactNode }) {
  const navRef = useRef<HTMLElement>(null);
  const [fadeEdges, setFadeEdges] = useState<FadeEdges>({ top: false, bottom: false });

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
    const nav = navRef.current;
    if (!nav) return;

    updateFadeEdges();
    const resizeObserver = new ResizeObserver(updateFadeEdges);
    resizeObserver.observe(nav);

    return () => resizeObserver.disconnect();
  }, [updateFadeEdges]);

  return (
    <div className="relative md:h-full">
      <nav
        ref={navRef}
        onScroll={updateFadeEdges}
        className="flex gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:h-full md:overflow-y-auto md:overflow-x-hidden"
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
    </div>
  );
}

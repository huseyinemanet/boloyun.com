"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClickSound } from "@/components/audio/click-sound-provider";

export function NavigationRuntime() {
  const router = useRouter();
  const { playClickSound } = useClickSound();
  const prefetched = useRef(new Set<string>());

  useEffect(() => {
    let timer: number | undefined;
    let pendingHref = "";

    function clearPending() {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      pendingHref = "";
    }

    function schedulePrefetch(event: Event) {
      if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-intent-prefetch='true']") : null;
      if (!link || link.origin !== window.location.origin || prefetched.current.has(link.href)) return;
      clearPending();
      pendingHref = link.href;
      const delay = Number(link.dataset.prefetchDelay ?? 120);
      timer = window.setTimeout(() => {
        prefetched.current.add(link.href);
        router.prefetch(`${link.pathname}${link.search}${link.hash}`);
        clearPending();
      }, Number.isFinite(delay) ? Math.max(80, delay) : 120);
    }

    function cancelPrefetch(event: Event) {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-intent-prefetch='true']") : null;
      if (link?.href === pendingHref) clearPending();
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-click-sound='true']") : null;
      if (!target || target.getAttribute("aria-disabled") === "true" || target.dataset.disabled === "true") return;
      playClickSound();
    }

    document.addEventListener("pointerover", schedulePrefetch, { passive: true });
    document.addEventListener("pointerout", cancelPrefetch, { passive: true });
    document.addEventListener("focusin", schedulePrefetch);
    document.addEventListener("focusout", cancelPrefetch);
    document.addEventListener("click", handleClick);

    return () => {
      clearPending();
      document.removeEventListener("pointerover", schedulePrefetch);
      document.removeEventListener("pointerout", cancelPrefetch);
      document.removeEventListener("focusin", schedulePrefetch);
      document.removeEventListener("focusout", cancelPrefetch);
      document.removeEventListener("click", handleClick);
    };
  }, [playClickSound, router]);

  return null;
}

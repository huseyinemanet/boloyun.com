"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { SoundLink } from "@/components/audio/sound-link";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof SoundLink>, "href" | "prefetch"> & {
  href: string;
  prefetchDelayMs?: number;
};

const prefetchedUrls = new Set<string>();
let activePrefetches = 0;
const maxConcurrentPrefetches = 2;

export function IntentPrefetchLink({
  href,
  prefetchDelayMs = 80,
  onFocus,
  onPointerEnter,
  onTouchStart,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();

  function schedulePrefetch() {
    if (!shouldPrefetch(href)) return;
    window.setTimeout(() => {
      if (!shouldPrefetch(href) || activePrefetches >= maxConcurrentPrefetches) return;
      activePrefetches += 1;
      prefetchedUrls.add(href);
      try {
        router.prefetch(href);
      } finally {
        window.setTimeout(() => {
          activePrefetches = Math.max(0, activePrefetches - 1);
        }, 250);
      }
    }, prefetchDelayMs);
  }

  return (
    <SoundLink
      {...props}
      href={href}
      prefetch={false}
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented) schedulePrefetch();
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (!event.defaultPrevented) schedulePrefetch();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        if (!event.defaultPrevented) schedulePrefetch();
      }}
    />
  );
}

function shouldPrefetch(href: string) {
  if (prefetchedUrls.has(href)) return false;
  if (!href.startsWith("/") || href.startsWith("/api/") || href.startsWith("/auth/")) return false;

  const connection = getConnection();
  if (connection?.saveData) return false;
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return false;

  return true;
}

function getConnection(): { saveData?: boolean; effectiveType?: string } | undefined {
  const navigatorWithConnection = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  return navigatorWithConnection.connection;
}

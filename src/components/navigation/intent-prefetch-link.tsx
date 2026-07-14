"use client";

import type { ComponentProps } from "react";
import { SoundLink } from "@/components/audio/sound-link";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof SoundLink>, "href" | "prefetch"> & {
  href: string;
  prefetchDelayMs?: number;
};

export function IntentPrefetchLink({
  href,
  prefetchDelayMs: _prefetchDelayMs,
  ...props
}: IntentPrefetchLinkProps) {
  void _prefetchDelayMs;

  return (
    <SoundLink
      {...props}
      href={href}
      native
    />
  );
}

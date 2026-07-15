import type { ComponentProps } from "react";
import { SoundLink } from "@/components/audio/sound-link";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof SoundLink>, "href" | "prefetch"> & {
  href: string;
  prefetchDelayMs?: number;
};

export function IntentPrefetchLink({
  href,
  prefetchDelayMs = 120,
  ...props
}: IntentPrefetchLinkProps) {
  return (
    <SoundLink
      {...props}
      href={href}
      prefetch={false}
      data-intent-prefetch="true"
      data-prefetch-delay={prefetchDelayMs}
    />
  );
}

"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";

type SoundLinkProps = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;
type NativeSoundLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  native?: boolean;
};

export const SoundLink = forwardRef<HTMLAnchorElement, SoundLinkProps | NativeSoundLinkProps>(function SoundLink({ onClick, ...props }, ref) {
  const pathname = usePathname();
  const { playClickSound } = useClickSound();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (shouldPlayLinkSound(event, pathname)) playClickSound();
  }

  const linkProps = { ...(props as SoundLinkProps & { native?: boolean }) };
  delete linkProps.native;
  return <Link ref={ref} {...linkProps} onClick={handleClick} />;
});

export function shouldPlayLinkSound(event: MouseEvent<HTMLAnchorElement>, pathname: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return false;
  }

  const anchor = event.currentTarget;
  if (anchor.getAttribute("aria-disabled") === "true" || anchor.dataset.disabled === "true") return false;

  try {
    const target = new URL(anchor.href);
    if (target.origin !== window.location.origin) return true;
    const current = new URL(window.location.href);
    return target.pathname !== pathname || target.search !== current.search || target.hash !== current.hash;
  } catch {
    return true;
  }
}

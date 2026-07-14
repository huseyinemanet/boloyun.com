"use client";

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";

type SoundAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export const SoundAnchor = forwardRef<HTMLAnchorElement, SoundAnchorProps>(function SoundAnchor({ onClick, ...props }, ref) {
  const { playClickSound } = useClickSound();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (shouldPlayAnchorSound(event)) playClickSound();
  }

  return <a ref={ref} {...props} onClick={handleClick} />;
});

function shouldPlayAnchorSound(event: MouseEvent<HTMLAnchorElement>) {
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
    return anchor.href !== window.location.href;
  } catch {
    return true;
  }
}

"use client";

import type { ComponentProps, MouseEvent } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Button } from "@/components/ui/button";

type SoundButtonProps = ComponentProps<typeof Button>;

export function SoundButton({ onClick, disabled, ...props }: SoundButtonProps) {
  const { playClickSound } = useClickSound();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented && !disabled && event.button === 0) playClickSound();
  }

  return <Button {...props} disabled={disabled} onClick={handleClick} />;
}

"use client";

import { Share2Icon } from "lucide-react";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Button } from "@/components/ui/button";

export function ShareGameButton({ title }: { title: string }) {
  const { playClickSound } = useClickSound();

  async function share() {
    playClickSound();
    if (navigator.share) await navigator.share({ title, url: window.location.href });
    else await navigator.clipboard.writeText(window.location.href);
  }
  return <Button type="button" variant="secondary" size="icon" onClick={share} aria-label="Oyunu paylaş" title="Oyunu paylaş"><Share2Icon /></Button>;
}

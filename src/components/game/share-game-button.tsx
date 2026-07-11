"use client";

import { Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareGameButton({ title }: { title: string }) {
  async function share() {
    if (navigator.share) await navigator.share({ title, url: window.location.href });
    else await navigator.clipboard.writeText(window.location.href);
  }
  return <Button type="button" variant="secondary" size="icon" onClick={share} aria-label="Oyunu paylaş" title="Oyunu paylaş"><Share2Icon /></Button>;
}

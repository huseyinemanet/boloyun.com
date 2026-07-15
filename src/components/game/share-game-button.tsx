"use client";

import { Share2Icon } from "lucide-react";
import { useState } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Button } from "@/components/ui/button";

export function ShareGameButton({ title }: { title: string }) {
  const { playClickSound } = useClickSound();
  const [message, setMessage] = useState("");

  async function share() {
    playClickSound();
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        setMessage("Paylaşım penceresi açıldı.");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Oyun bağlantısı kopyalandı.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Paylaşım yapılamadı.");
    }
  }
  return (
    <>
      <Button type="button" variant="secondary" size="icon" onClick={share} aria-label="Oyunu paylaş" title="Oyunu paylaş"><Share2Icon /></Button>
      <span className="sr-only" aria-live="polite">{message}</span>
    </>
  );
}

"use client";

import { Share2Icon } from "@/components/icons/app-icons";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trackAnalyticsEvent } from "@/lib/analytics";

export function ShareGameButton({ title, slug }: { title: string; slug: string }) {
  const { playClickSound } = useClickSound();
  const [message, setMessage] = useState("");
  const imageFilePromiseRef = useRef<Promise<File | null> | null>(null);

  function prepareShareImage() {
    if (!imageFilePromiseRef.current) {
      imageFilePromiseRef.current = createShareImageFile(slug);
    }
    return imageFilePromiseRef.current;
  }

  async function share() {
    playClickSound();
    try {
      if (navigator.share) {
        const url = window.location.href;
        const imageFile = await prepareShareImage();
        const shareWithImage: ShareData = {
          title,
          text: `${title} oyununu oyna\n${url}`,
          files: imageFile ? [imageFile] : undefined,
        };
        const shareData = imageFile && navigator.canShare?.(shareWithImage)
          ? shareWithImage
          : { title, url };
        await navigator.share(shareData);
        trackAnalyticsEvent("share", { method: "web_share", content_type: "game", item_name: title });
        setMessage("Paylaşım penceresi açıldı.");
        toast.success("Paylaşım penceresi açıldı.");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        trackAnalyticsEvent("share", { method: "clipboard", content_type: "game", item_name: title });
        setMessage("Oyun bağlantısı kopyalandı.");
        toast.success("Oyun bağlantısı kopyalandı.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Paylaşım yapılamadı.");
      toast.error("Paylaşım yapılamadı.");
    }
  }
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onPointerEnter={prepareShareImage}
            onFocus={prepareShareImage}
            onTouchStart={prepareShareImage}
            onClick={share}
            aria-label="Oyunu paylaş"
          >
            <Share2Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Oyunu paylaş</p></TooltipContent>
      </Tooltip>
      <span className="sr-only" aria-live="polite">{message}</span>
    </>
  );
}

async function createShareImageFile(slug: string) {
  try {
    const response = await fetch(`/oyun/${encodeURIComponent(slug)}/paylasim-kapagi`, { cache: "force-cache" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${slug}.${extension}`, { type: blob.type });
  } catch {
    return null;
  }
}

"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackAnalyticsEvent } from "@/lib/analytics";

export function ProfileAvatarUpload({ className, onPendingChange }: { className?: string; onPendingChange?: (pending: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  function updatePending(value: boolean) {
    setPending(value);
    onPendingChange?.(value);
  }
  async function upload(file?: File) {
    if (!file) return;
    updatePending(true);
    setMessage(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const result = response.headers.get("content-type")?.includes("application/json")
        ? await response.json() as { error?: string }
        : { error: response.ok ? undefined : "Sunucu yükleme isteğini tamamlayamadı. Lütfen tekrar deneyin." };
      if (!response.ok) throw new Error(result.error || "Yükleme başarısız.");
      trackAnalyticsEvent("profile_avatar_update", { status: "success" });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Yükleme başarısız.");
      updatePending(false);
    }
  }
  return <div className={cn("mt-3", className)}><input ref={input} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event.target.files?.[0])} /><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}><UploadIcon />{pending ? "Yükleniyor…" : "Fotoğrafı Değiştir"}</Button>{message ? <p className="mt-2 text-xs font-semibold text-destructive">{message}</p> : null}</div>;
}

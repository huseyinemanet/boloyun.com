"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileAvatarUpload() {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function upload(file?: File) {
    if (!file) return;
    setPending(true);
    setMessage(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Yükleme başarısız.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Yükleme başarısız.");
      setPending(false);
    }
  }
  return <div className="mt-3"><input ref={input} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event.target.files?.[0])} /><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}><UploadIcon />{pending ? "Yükleniyor…" : "Fotoğrafı Değiştir"}</Button>{message ? <p className="mt-2 text-xs font-semibold text-destructive">{message}</p> : null}</div>;
}

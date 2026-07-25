"use client";

import { SoundLink } from "@/components/audio/sound-link";
import { useViewerState } from "@/components/auth/viewer-state-provider";
import { CommentForm } from "./comment-form";

export function CommentAuthGate({ gameId, slug }: { gameId: string; slug: string }) {
  const { status, profile, refresh } = useViewerState();

  if (status === "loading") {
    return null;
  }

  if (status === "unavailable") {
    return (
      <p className="mt-4 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">
        Hesap durumu alınamadı.{" "}
        <button type="button" onClick={() => void refresh()} className="text-primary hover:underline">
          Yeniden dene
        </button>
      </p>
    );
  }

  if (status === "authenticated" && profile) {
    return <CommentForm gameId={gameId} slug={slug} />;
  }

  return (
    <p className="mt-4 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">
      Yorum yazmak için <SoundLink href="/giris" className="text-primary hover:underline">giriş yap</SoundLink> veya <SoundLink href="/kayit" className="text-primary hover:underline">kayıt ol</SoundLink>.
    </p>
  );
}

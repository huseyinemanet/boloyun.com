"use client";

import { SoundLink } from "@/components/audio/sound-link";
import { useViewerState } from "@/components/auth/viewer-state-provider";
import { CommentForm } from "./comment-form";

export function CommentAuthGate({ gameId, slug }: { gameId: string; slug: string }) {
  const { loaded, profile } = useViewerState();

  if (!loaded) {
    return null;
  }

  if (profile) {
    return <CommentForm gameId={gameId} slug={slug} />;
  }

  return (
    <p className="mt-4 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">
      Yorum yazmak için <SoundLink href="/giris" className="text-primary hover:underline">giriş yap</SoundLink> veya <SoundLink href="/kayit" className="text-primary hover:underline">kayıt ol</SoundLink>.
    </p>
  );
}

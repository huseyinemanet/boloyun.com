"use client";

import { useEffect, useRef, useState } from "react";
import { SoundLink } from "@/components/audio/sound-link";
import { CommentForm } from "./comment-form";

type MeResponse = {
  profile: unknown | null;
};

export function CommentAuthGate({ gameId, slug }: { gameId: string; slug: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!hasAuthCookie()) {
      queueMicrotask(() => setLoaded(true));
      return;
    }

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "600px 0px" });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad || loaded) return;
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json() as MeResponse;
        if (!controller.signal.aborted) setIsLoggedIn(Boolean(data.profile));
      } catch {
        // The login prompt is the safe fallback.
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, [loaded, shouldLoad]);

  if (!loaded) {
    return <div ref={containerRef}><p className="mt-4 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">Yorum alanı hazırlanıyor...</p></div>;
  }

  if (isLoggedIn) {
    return <CommentForm gameId={gameId} slug={slug} />;
  }

  return (
    <p className="mt-4 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">
      Yorum yazmak için <SoundLink href="/giris" className="text-primary hover:underline">giriş yap</SoundLink> veya <SoundLink href="/kayit" className="text-primary hover:underline">kayıt ol</SoundLink>.
    </p>
  );
}

function hasAuthCookie() {
  return /\b(?:sb-|supabase-auth-token)/.test(document.cookie);
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { GameComment } from "@/lib/db-comments";

const CommentAuthGate = dynamic(() => import("./comment-auth-gate").then((module) => module.CommentAuthGate), { ssr: false });
const CommentStatusNotice = dynamic(() => import("./comment-status-notice").then((module) => module.CommentStatusNotice), { ssr: false });
const CommentsTabs = dynamic(() => import("./comments-tabs").then((module) => module.CommentsTabs), { ssr: false });

type CommentsPayload = {
  latestComments: GameComment[];
  topComments: GameComment[];
};

export function LazyComments({ gameId, slug }: { gameId: string; slug: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [payload, setPayload] = useState<CommentsPayload | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "loaded" | "failed">("idle");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || loadState !== "idle") return;

    const controller = new AbortController();
    const load = async () => {
      setLoadState("loading");
      try {
        const response = await fetch(`/api/comments?gameId=${encodeURIComponent(gameId)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Yorum isteği başarısız: ${response.status}`);
        setPayload(await response.json() as CommentsPayload);
        setLoadState("loaded");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[comments] lazy load failed", error);
        setLoadState("failed");
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void load();
    }, { rootMargin: "400px 0px" });
    observer.observe(section);

    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [gameId, loadState]);

  const latestComments = payload?.latestComments ?? [];
  const topComments = payload?.topComments ?? [];

  return (
    <section ref={sectionRef} id="yorumlar" className="min-h-48 scroll-mt-24 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Yorumlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Yorumlar onaydan sonra yayınlanır.</p>
        </div>
        {loadState === "loaded" ? (
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold text-foreground">
            {latestComments.length.toLocaleString("tr-TR")} yorum
          </span>
        ) : null}
      </div>

      {loadState === "failed" ? (
        <p className="mt-4 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">Yorumlar şu anda yüklenemedi.</p>
      ) : loadState !== "loaded" ? (
        <p className="mt-4 animate-pulse rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">Yorumlar hazırlanıyor...</p>
      ) : (
        <>
          <CommentStatusNotice />
          <CommentAuthGate gameId={gameId} slug={slug} />
          <CommentsTabs topComments={topComments} latestComments={latestComments} />
        </>
      )}
    </section>
  );
}

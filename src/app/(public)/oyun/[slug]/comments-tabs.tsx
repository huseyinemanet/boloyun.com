"use client";

import { useState } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Button } from "@/components/ui/button";
import type { GameComment } from "@/lib/db-comments";

type CommentTab = "top" | "latest";

export function CommentsTabs({
  topComments,
  latestComments,
}: {
  topComments: GameComment[];
  latestComments: GameComment[];
}) {
  const [activeTab, setActiveTab] = useState<CommentTab>("top");
  const { playClickSound } = useClickSound();
  const visibleComments = activeTab === "top" ? topComments : latestComments;
  const emptyText = activeTab === "top" ? "Henüz öne çıkan yorum yok." : "Henüz onaylanmış yorum yok.";

  return (
    <div className="mt-5">
      <div className="inline-flex rounded-md border border-border bg-muted/40 p-1">
        <TabButton
          isActive={activeTab === "top"}
          label="Öne Çıkan"
          count={topComments.length}
          onClick={() => { if (activeTab !== "top") playClickSound(); setActiveTab("top"); }}
        />
        <TabButton
          isActive={activeTab === "latest"}
          label="Son Yorumlar"
          count={latestComments.length}
          onClick={() => { if (activeTab !== "latest") playClickSound(); setActiveTab("latest"); }}
        />
      </div>

      <div className="mt-3 space-y-3">
        {visibleComments.length ? (
          visibleComments.map((comment) => <CommentItem key={comment.id} comment={comment} />)
        ) : (
          <p className="rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  isActive,
  label,
  count,
  onClick,
}: {
  isActive: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      onClick={onClick}
      className={`h-9 px-3 text-sm font-bold ${isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      aria-pressed={isActive}
    >
      {label}
      <span className="ml-2 text-xs text-muted-foreground">{count.toLocaleString("tr-TR")}</span>
    </Button>
  );
}

function CommentItem({ comment }: { comment: GameComment }) {
  return (
    <article className="rounded-md border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm font-semibold">{comment.username}</strong>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {comment.likesCount > 0 ? <span>{comment.likesCount.toLocaleString("tr-TR")} beğeni</span> : null}
          <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString("tr-TR")}</time>
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-foreground">{comment.body}</p>
    </article>
  );
}

"use client";

import { useState } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatFullDateTime, formatRelativeDateTime } from "@/lib/date-time";
import type { GameComment } from "@/lib/db-comments";

type CommentTab = "top" | "latest";

export function CommentsTabs({
  topComments,
  latestComments,
  referenceTime,
}: {
  topComments: GameComment[];
  latestComments: GameComment[];
  referenceTime: string;
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
          visibleComments.map((comment) => <CommentItem key={comment.id} comment={comment} referenceTime={referenceTime} />)
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

function CommentItem({ comment, referenceTime }: { comment: GameComment; referenceTime: string }) {
  return (
    <article className="rounded-md border border-border bg-muted/40 p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          {comment.avatarUrl ? <AvatarImage src={comment.avatarUrl} alt={`${comment.displayName} profil fotoğrafı`} /> : null}
          <AvatarFallback>{getInitials(comment.displayName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <strong className="min-w-0 truncate text-sm font-semibold text-foreground">{comment.displayName}</strong>
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
              {comment.likesCount > 0 ? <span>{comment.likesCount.toLocaleString("tr-TR")} beğeni</span> : null}
              <time dateTime={comment.createdAt} title={formatFullDateTime(comment.createdAt)}>
                {formatRelativeDateTime(comment.createdAt, new Date(referenceTime))}
              </time>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground">{comment.body}</p>
        </div>
      </div>
    </article>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return (initials || "O").toLocaleUpperCase("tr-TR");
}

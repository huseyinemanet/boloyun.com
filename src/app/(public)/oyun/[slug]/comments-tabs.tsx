"use client";

import { useState } from "react";
import { useViewerState } from "@/components/auth/viewer-state-provider";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader } from "@/components/ui/message";
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
  const { profile } = useViewerState();
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

      <div className="mt-4 space-y-4" role="list">
        {visibleComments.length ? (
          visibleComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isOwn={profile?.id === comment.profileId}
            />
          ))
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

function CommentItem({ comment, isOwn }: { comment: GameComment; isOwn: boolean }) {
  return (
    <Message align="start" role="listitem" aria-label={`${comment.displayName} yorumu`}>
      <MessageAvatar>
        <Avatar className="size-9">
          {comment.avatarUrl ? <AvatarImage src={comment.avatarUrl} alt={`${comment.displayName} profil fotoğrafı`} /> : null}
          <AvatarFallback>{getInitials(comment.displayName)}</AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent className="max-w-[calc(100%-2.75rem)] gap-0 sm:max-w-[75%]">
        <MessageHeader>
          <strong className="truncate font-semibold">{comment.displayName}</strong>
        </MessageHeader>
        <Bubble variant={isOwn ? "default" : "secondary"} align="start">
          <BubbleContent className="min-h-9 px-4 py-2 leading-5">
            <p className="whitespace-pre-wrap">{comment.body}</p>
          </BubbleContent>
        </Bubble>
        {comment.likesCount > 0 ? (
          <MessageFooter>
            <span>{comment.likesCount.toLocaleString("tr-TR")} beğeni</span>
          </MessageFooter>
        ) : null}
      </MessageContent>
    </Message>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return (initials || "O").toLocaleUpperCase("tr-TR");
}

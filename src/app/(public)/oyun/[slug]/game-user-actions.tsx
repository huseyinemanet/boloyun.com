"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { IconThumbsDownFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconThumbsDownFillDuo18";
import { IconThumbsUpFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconThumbsUpFillDuo18";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Button } from "@/components/ui/button";
import type { GameVote } from "@/lib/db-game-reactions";
import { cn } from "@/lib/utils";

type GameState = {
  isFavorite: boolean;
  userVote: GameVote | null;
  isLoggedIn: boolean;
};

export function GameUserActions({
  gameId,
  slug,
  likesCount,
  dislikesCount,
  showVotes,
  showFavorite,
}: {
  gameId: string;
  slug: string;
  likesCount: number;
  dislikesCount: number;
  showVotes: boolean;
  showFavorite: boolean;
}) {
  const [state, setState] = useState<GameState>({ isFavorite: false, userVote: null, isLoggedIn: false });
  const [counts, setCounts] = useState({ likes: likesCount, dislikes: dislikesCount });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isUuid(gameId) || (!showVotes && !showFavorite)) return;
    if (!hasPersonalStateCookie()) return;
    const controller = new AbortController();
    async function loadState() {
      try {
        const response = await fetch(`/api/game-state?gameId=${encodeURIComponent(gameId)}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json() as Partial<GameState>;
        if (!controller.signal.aborted) {
          setState({
            isFavorite: Boolean(data.isFavorite),
            userVote: data.userVote === "like" || data.userVote === "dislike" ? data.userVote : null,
            isLoggedIn: Boolean(data.isLoggedIn),
          });
        }
      } catch {
        // Personal state is a progressive enhancement; the public page stays playable without it.
      }
    }
    void loadState();
    return () => controller.abort();
  }, [gameId, showFavorite, showVotes]);

  async function runAction(payload: Record<string, unknown>) {
    const response = await fetch("/api/game-action", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId, slug, ...payload }),
    });
    const data = await response.json() as Partial<GameState> & {
      ok?: boolean;
      likesCount?: number;
      dislikesCount?: number;
      error?: string;
    };
    if (!response.ok || !data.ok) throw new Error(data.error || "İşlem tamamlanamadı.");

    setState((current) => ({
      isFavorite: typeof data.isFavorite === "boolean" ? data.isFavorite : current.isFavorite,
      userVote: data.userVote === "like" || data.userVote === "dislike" ? data.userVote : current.userVote,
      isLoggedIn: typeof data.isLoggedIn === "boolean" ? data.isLoggedIn : current.isLoggedIn,
    }));
    if (typeof data.likesCount === "number" || typeof data.dislikesCount === "number") {
      setCounts((current) => ({
        likes: typeof data.likesCount === "number" ? data.likesCount : current.likes,
        dislikes: typeof data.dislikesCount === "number" ? data.dislikesCount : current.dislikes,
      }));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showVotes ? (
        <VoteButtons
          likesCount={counts.likes}
          dislikesCount={counts.dislikes}
          userVote={state.userVote}
          onVote={(vote) => runAction({ action: "vote", vote })}
          onNotice={setNotice}
        />
      ) : null}
      {showFavorite ? <FavoriteButton gameId={gameId} slug={slug} isFavorite={state.isFavorite} onToggle={() => runAction({ action: "favorite", desired: !state.isFavorite })} onNotice={setNotice} /> : null}
      <span className="sr-only" aria-live="polite">{notice}</span>
    </div>
  );
}

function hasPersonalStateCookie() {
  return /(?:^|;\s*)(?:sb-[^=]+-auth-token|supabase-auth-token(?:\.[^=]+)?)=/.test(document.cookie);
}

function FavoriteButton({ gameId, isFavorite, onToggle, onNotice }: { gameId: string; slug: string; isFavorite: boolean; onToggle: () => Promise<void>; onNotice: (message: string) => void }) {
  const canFavorite = isUuid(gameId);
  const [pending, setPending] = useState(false);
  const { playClickSound } = useClickSound();

  if (!canFavorite) {
    return (
      <Button
        type="button"
        disabled
        variant="outline"
        size="icon-sm"
        className="cursor-not-allowed text-muted-foreground opacity-60"
        aria-label="Favorilere ekle"
        title="Favorilere ekle"
      >
        <IconHeartFillDuo18 className="size-[18px]" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      className={cn(isFavorite ? "border-destructive/40 bg-destructive/10 text-destructive ring-1 ring-destructive/20" : "")}
      aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      aria-pressed={isFavorite}
      aria-busy={pending}
      disabled={pending}
      title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      onClick={async () => {
        if (pending) return;
        playClickSound();
        setPending(true);
        try {
          await onToggle();
          const message = isFavorite ? "Favorilerden çıkarıldı." : "Favorilere eklendi.";
          onNotice(message);
          toast.success(message);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Favori işlemi tamamlanamadı.";
          onNotice(message);
          toast.error(message);
        } finally {
          setPending(false);
        }
      }}
    >
      <span className="grid size-[18px] shrink-0 place-items-center">
        {pending ? <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden="true" /> : <IconHeartFillDuo18 className={`size-[18px] ${isFavorite ? "" : "opacity-60"}`} aria-hidden="true" />}
      </span>
    </Button>
  );
}

function VoteButtons({
  likesCount,
  dislikesCount,
  userVote,
  onVote,
  onNotice,
}: {
  likesCount: number;
  dislikesCount: number;
  userVote: GameVote | null;
  onVote: (vote: GameVote) => Promise<void>;
  onNotice: (message: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <VoteButton active={userVote === "like"} ariaLabel="Beğendim" count={likesCount.toLocaleString("tr-TR")} title="Beğendim" onClick={() => onVote("like")} onNotice={onNotice}>
        <IconThumbsUpFillDuo18 className="size-[18px]" aria-hidden="true" />
      </VoteButton>
      <VoteButton active={userVote === "dislike"} ariaLabel="Beğenmedim" count={dislikesCount.toLocaleString("tr-TR")} title="Beğenmedim" onClick={() => onVote("dislike")} onNotice={onNotice}>
        <IconThumbsDownFillDuo18 className="size-[18px]" aria-hidden="true" />
      </VoteButton>
    </div>
  );
}

function VoteButton({
  active,
  ariaLabel,
  children,
  count,
  onClick,
  title,
  onNotice,
}: {
  active: boolean;
  ariaLabel: string;
  children: ReactNode;
  count: string;
  onClick: () => Promise<void>;
  title: string;
  onNotice: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const { playClickSound } = useClickSound();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn(active ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "")}
      aria-label={ariaLabel}
      aria-pressed={active}
      aria-busy={pending}
      disabled={pending}
      title={title}
      onClick={async () => {
        if (pending) return;
        playClickSound();
        setPending(true);
        try {
          await onClick();
          const message = active ? `${title} tercihin güncellendi.` : `${title} olarak işaretlendi.`;
          onNotice(message);
          toast.success(message);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Oy işlemi tamamlanamadı.";
          onNotice(message);
          toast.error(message);
        } finally {
          setPending(false);
        }
      }}
    >
      <span className="grid size-[18px] shrink-0 place-items-center">
        {pending ? <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden="true" /> : children}
      </span>
      <span className="min-w-[1ch] tabular-nums">{count}</span>
    </Button>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

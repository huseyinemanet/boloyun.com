"use client";

import { useEffect, useState } from "react";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { IconThumbsDownFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconThumbsDownFillDuo18";
import { IconThumbsUpFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconThumbsUpFillDuo18";
import { GameActionSubmitButton } from "@/components/game/game-action-submit-button";
import { Button } from "@/components/ui/button";
import type { GameVote } from "@/lib/db-game-reactions";
import { toggleFavoriteAction, voteGameAction } from "./actions";

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

  return (
    <>
      {showVotes ? (
        <VoteButtons
          gameId={gameId}
          slug={slug}
          likesCount={likesCount}
          dislikesCount={dislikesCount}
          userVote={state.userVote}
        />
      ) : null}
      {showFavorite ? <FavoriteButton gameId={gameId} slug={slug} isFavorite={state.isFavorite} /> : null}
    </>
  );
}

function hasPersonalStateCookie() {
  return /\b(?:mini_game_session|sb-|supabase-auth-token)/.test(document.cookie);
}

function FavoriteButton({ gameId, slug, isFavorite }: { gameId: string; slug: string; isFavorite: boolean }) {
  const canFavorite = isUuid(gameId);

  if (!canFavorite) {
    return (
      <Button
        type="button"
        disabled
        variant="outline"
        size="icon"
        className="cursor-not-allowed text-muted-foreground opacity-60"
        aria-label="Favorilere ekle"
        title="Favorilere ekle"
      >
        <IconHeartFillDuo18 className="size-[18px]" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <form action={toggleFavoriteAction}>
      <input type="hidden" name="game_id" value={gameId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="desired" value={isFavorite ? "false" : "true"} />
      <GameActionSubmitButton
        iconOnly
        className={isFavorite ? "border-destructive/40 bg-destructive/10 text-destructive ring-1 ring-destructive/20" : ""}
        active={isFavorite}
        ariaLabel={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
        title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      >
        <IconHeartFillDuo18 className={`size-[18px] ${isFavorite ? "" : "opacity-60"}`} aria-hidden="true" />
      </GameActionSubmitButton>
    </form>
  );
}

function VoteButtons({
  gameId,
  slug,
  likesCount,
  dislikesCount,
  userVote,
}: {
  gameId: string;
  slug: string;
  likesCount: number;
  dislikesCount: number;
  userVote: GameVote | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <form action={voteGameAction}>
        <input type="hidden" name="game_id" value={gameId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="vote" value="like" />
        <GameActionSubmitButton active={userVote === "like"} ariaLabel="Beğendim" className={voteButtonClass(userVote === "like")} count={likesCount.toLocaleString("tr-TR")} title="Beğendim">
          <IconThumbsUpFillDuo18 className="size-[18px]" aria-hidden="true" />
        </GameActionSubmitButton>
      </form>
      <form action={voteGameAction}>
        <input type="hidden" name="game_id" value={gameId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="vote" value="dislike" />
        <GameActionSubmitButton active={userVote === "dislike"} ariaLabel="Beğenmedim" className={voteButtonClass(userVote === "dislike")} count={dislikesCount.toLocaleString("tr-TR")} title="Beğenmedim">
          <IconThumbsDownFillDuo18 className="size-[18px]" aria-hidden="true" />
        </GameActionSubmitButton>
      </form>
    </div>
  );
}

function voteButtonClass(isActive: boolean) {
  return `h-9 gap-1.5 px-2.5 ${isActive ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : ""}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

"use client";

import { useEffect, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { gameReactions, isGameReaction, type GameReaction } from "@/lib/db-game-reactions";
import { cn } from "@/lib/utils";
import { gameAnalyticsItem, trackAnalyticsEvent } from "@/lib/analytics";

type GameState = {
  isFavorite: boolean;
  selectedReaction: GameReaction | null;
  isLoggedIn: boolean;
};

export function GameUserActions({
  gameId,
  slug,
  showVotes,
  showFavorite,
  title,
}: {
  gameId: string;
  slug: string;
  showVotes: boolean;
  showFavorite: boolean;
  title: string;
}) {
  const [state, setState] = useState<GameState>({ isFavorite: false, selectedReaction: null, isLoggedIn: false });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isUuid(gameId) || (!showVotes && !showFavorite)) return;
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
            selectedReaction: isGameReaction(data.selectedReaction) ? data.selectedReaction : null,
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
      selectedReaction?: unknown;
      error?: string;
    };
    if (!response.ok || !data.ok) throw new Error(data.error || "İşlem tamamlanamadı.");

    setState((current) => ({
      isFavorite: typeof data.isFavorite === "boolean" ? data.isFavorite : current.isFavorite,
      selectedReaction: data.selectedReaction === null || isGameReaction(data.selectedReaction) ? data.selectedReaction : current.selectedReaction,
      isLoggedIn: typeof data.isLoggedIn === "boolean" ? data.isLoggedIn : current.isLoggedIn,
    }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showVotes ? (
        <ReactionButtons
          selectedReaction={state.selectedReaction}
          onReact={(reaction) => runAction({ action: "reaction", reaction })}
          onNotice={setNotice}
          game={{ id: slug, title }}
        />
      ) : null}
      {showFavorite ? <FavoriteButton gameId={gameId} slug={slug} gameTitle={title} isFavorite={state.isFavorite} onToggle={() => runAction({ action: "favorite", desired: !state.isFavorite })} onNotice={setNotice} /> : null}
      <span className="sr-only" aria-live="polite">{notice}</span>
    </div>
  );
}

function FavoriteButton({ gameId, slug, gameTitle, isFavorite, onToggle, onNotice }: { gameId: string; slug: string; gameTitle: string; isFavorite: boolean; onToggle: () => Promise<void>; onNotice: (message: string) => void }) {
  const canFavorite = isUuid(gameId);
  const [pending, setPending] = useState(false);
  const { playClickSound } = useClickSound();

  if (!canFavorite) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              disabled
              variant="outline"
              size="icon-sm"
              className="cursor-not-allowed text-muted-foreground opacity-60"
              aria-label="Favorilere ekle"
            >
              <IconHeartFillDuo18 className="size-[18px]" aria-hidden="true" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent><p>Favorilere ekle</p></TooltipContent>
      </Tooltip>
    );
  }

  const tooltipLabel = isFavorite ? "Favorilerden çıkar" : "Favorilere ekle";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className={cn(isFavorite ? "border-destructive/40 bg-destructive/10 text-destructive ring-1 ring-destructive/20" : "")}
          aria-label={tooltipLabel}
          aria-pressed={isFavorite}
          aria-busy={pending}
          disabled={pending}
          onClick={async () => {
            if (pending) return;
            playClickSound();
            setPending(true);
            try {
              await onToggle();
              trackAnalyticsEvent(isFavorite ? "remove_from_wishlist" : "add_to_wishlist", { items: [gameAnalyticsItem({ id: slug, title: gameTitle })] });
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
      </TooltipTrigger>
      <TooltipContent><p>{tooltipLabel}</p></TooltipContent>
    </Tooltip>
  );
}

const reactionDetails: Record<GameReaction, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Beğendim" },
  love: { emoji: "❤️", label: "Bayıldım" },
  haha: { emoji: "😆", label: "Çok komik" },
  wow: { emoji: "😮", label: "İnanılmaz" },
  sad: { emoji: "😢", label: "Üzüldüm" },
  angry: { emoji: "😡", label: "Kızdım" },
};

function ReactionButtons({
  selectedReaction,
  onReact,
  onNotice,
  game,
}: {
  selectedReaction: GameReaction | null;
  onReact: (reaction: GameReaction) => Promise<void>;
  onNotice: (message: string) => void;
  game: { id: string; title: string };
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1" aria-label="Oyun reaksiyonları">
      {gameReactions.map((reaction) => {
        const details = reactionDetails[reaction];
        return (
          <ReactionButton
            key={reaction}
            active={selectedReaction === reaction}
            reaction={reaction}
            emoji={details.emoji}
            label={details.label}
            game={game}
            onClick={() => onReact(reaction)}
            onNotice={onNotice}
          />
        );
      })}
    </div>
  );
}

function ReactionButton({
  active,
  emoji,
  label,
  onClick,
  onNotice,
  reaction,
  game,
}: {
  active: boolean;
  emoji: string;
  label: string;
  onClick: () => Promise<void>;
  onNotice: (message: string) => void;
  reaction: GameReaction;
  game: { id: string; title: string };
}) {
  const [pending, setPending] = useState(false);
  const { playClickSound } = useClickSound();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "rounded-full text-lg leading-none transition duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-background",
            active ? "scale-110 bg-background ring-2 ring-primary/70 shadow-sm" : "",
          )}
          aria-label={active ? `${label} tepkisini kaldır` : `${label} tepkisi ver`}
          aria-pressed={active}
          aria-busy={pending}
          disabled={pending}
          onClick={async () => {
            if (pending) return;
            playClickSound();
            setPending(true);
            try {
              await onClick();
              trackAnalyticsEvent("game_reaction", { reaction: active ? `remove_${reaction}` : reaction, items: [gameAnalyticsItem(game)] });
              const message = active ? "Tepkin kaldırıldı." : `${label} tepkin kaydedildi.`;
              onNotice(message);
              toast.success(message);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Reaksiyon işlemi tamamlanamadı.";
              onNotice(message);
              toast.error(message);
            } finally {
              setPending(false);
            }
          }}
        >
          <span className="flex size-6 shrink-0 items-center justify-center leading-none">
            {pending ? (
              <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden="true" />
            ) : (
              <span className="block -translate-y-px leading-none" aria-hidden="true">{emoji}</span>
            )}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent><p>{active ? `${label} tepkisini kaldır` : label}</p></TooltipContent>
    </Tooltip>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

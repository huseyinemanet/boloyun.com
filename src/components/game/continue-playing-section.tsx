"use client";

import { useEffect, useState } from "react";
import { useViewerState } from "@/components/auth/viewer-state-provider";
import { GameCard } from "@/components/game/game-card";
import type { ContinuePlayingGame } from "@/lib/db-continue-playing";

type ContinuePlayingResponse = {
  games?: ContinuePlayingGame[];
};

export function ContinuePlayingSection() {
  const [games, setGames] = useState<ContinuePlayingGame[]>([]);
  const { status: viewerStatus } = useViewerState();

  useEffect(() => {
    if (viewerStatus !== "authenticated" && viewerStatus !== "anonymous") return;
    const controller = new AbortController();
    void loadContinuePlayingGames(controller.signal).then((nextGames) => {
      if (!controller.signal.aborted) setGames(nextGames);
    });
    return () => controller.abort();
  }, [viewerStatus]);

  if (games.length === 0) return null;

  return (
    <section data-analytics-view-list data-analytics-list-name="Oynamaya Devam Et" className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Oynamaya Devam Et</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {games.map((game) => <GameCard key={game.id} game={game} />)}
      </div>
    </section>
  );
}

async function loadContinuePlayingGames(signal: AbortSignal) {
  try {
    const response = await fetch("/api/continue-playing", {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    if (!response.ok) return [];
    const result = await response.json() as ContinuePlayingResponse;
    return Array.isArray(result.games) ? result.games : [];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return [];
    console.error("[continue-playing] game history request failed", error);
    return [];
  }
}

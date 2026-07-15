"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { PlayableGameSource } from "@/types/game";

const GamePlayer = dynamic(
  () => import("@/components/player/game-player").then((module) => module.GamePlayer),
  {
    ssr: false,
    loading: () => <div className="player-grid aspect-video animate-pulse rounded-md bg-black" aria-label="Oyun hazırlanıyor" />,
  },
);

type LazyGamePlayerProps = {
  game: PlayableGameSource;
  playEventName?: string;
  isLoggedIn?: boolean;
  allowGuestPlay?: boolean;
  allowFullscreen?: boolean;
  aspectRatio?: "16:9" | "4:3";
  loadTimeoutSeconds?: number;
  sourceAllowed?: boolean;
  preRoll?: ReactNode;
  preRollSkipSeconds?: number;
};

export function LazyGamePlayer(props: LazyGamePlayerProps) {
  return <GamePlayer {...props} />;
}

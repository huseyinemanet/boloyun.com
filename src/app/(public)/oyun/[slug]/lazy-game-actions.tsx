"use client";

import dynamic from "next/dynamic";

const GameUserActions = dynamic(() => import("./game-user-actions").then((module) => module.GameUserActions), { ssr: false });
const ShareGameButton = dynamic(() => import("@/components/game/share-game-button").then((module) => module.ShareGameButton), { ssr: false });
const AdminEditGameLink = dynamic(() => import("./admin-edit-game-link").then((module) => module.AdminEditGameLink), { ssr: false });

type LazyGameActionsProps = {
  gameId: string;
  slug: string;
  showVotes: boolean;
  showFavorite: boolean;
  showShare: boolean;
  title: string;
};

export function LazyGameActions({ showShare, title, ...actionProps }: LazyGameActionsProps) {
  return (
    <>
      <GameUserActions {...actionProps} title={title} />
      {showShare ? <ShareGameButton title={title} slug={actionProps.slug} /> : null}
      <AdminEditGameLink gameId={actionProps.gameId} title={title} />
    </>
  );
}

import { Suspense } from "react";
import { getApprovedCommentsForGame, getTopCommentsForGame } from "@/lib/db-comments";
import { CommentAuthGate } from "./comment-auth-gate";
import { CommentStatusNotice } from "./comment-status-notice";
import { CommentsTabs } from "./comments-tabs";

export async function LazyComments({ gameId, slug }: { gameId: string; slug: string }) {
  const [latestComments, topComments] = await Promise.all([
    getApprovedCommentsForGame(gameId),
    getTopCommentsForGame(gameId),
  ]);

  return (
    <section id="yorumlar" className="scroll-mt-24 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Yorumlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Yorumlar onaydan sonra yayınlanır.</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold text-foreground">
          {latestComments.length.toLocaleString("tr-TR")} yorum
        </span>
      </div>

      <Suspense fallback={null}>
        <CommentStatusNotice />
      </Suspense>
      <CommentAuthGate gameId={gameId} slug={slug} />
      <CommentsTabs topComments={topComments} latestComments={latestComments} />
    </section>
  );
}

import { Suspense } from "react";
import { getApprovedCommentsCountForGame, getApprovedCommentsForGame, getTopCommentsForGame } from "@/lib/db-comments";
import { Badge } from "@/components/ui/badge";
import { CommentAuthGate } from "./comment-auth-gate";
import { CommentGuidelinesDialog } from "./comment-guidelines-dialog";
import { CommentStatusNotice } from "./comment-status-notice";
import { CommentsTabs } from "./comments-tabs";

export async function LazyComments({ gameId, slug }: { gameId: string; slug: string }) {
  const [latestComments, topComments, approvedCommentsCount] = await Promise.all([
    getApprovedCommentsForGame(gameId),
    getTopCommentsForGame(gameId),
    getApprovedCommentsCountForGame(gameId),
  ]);

  return (
    <section id="yorumlar" className="scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Yorumlar</h2>
            <Badge variant="secondary" aria-label={`${approvedCommentsCount.toLocaleString("tr-TR")} yorum`}>
              {approvedCommentsCount.toLocaleString("tr-TR")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Yorumlar onaydan sonra yayınlanır.</p>
        </div>
        <CommentGuidelinesDialog />
      </div>

      <Suspense fallback={null}>
        <CommentStatusNotice />
      </Suspense>
      <CommentAuthGate gameId={gameId} slug={slug} />
      <CommentsTabs topComments={topComments} latestComments={latestComments} />
    </section>
  );
}

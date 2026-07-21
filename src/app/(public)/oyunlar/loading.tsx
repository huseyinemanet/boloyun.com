import { GameGridSkeleton, SkeletonBlock } from "@/components/game/game-card-skeleton";

export default function GamesArchiveLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <section>
        <SkeletonBlock className="h-8 w-44" />
        <SkeletonBlock className="mt-2 h-5 w-full max-w-2xl" />
      </section>
      <SkeletonBlock className="h-9 w-full" />
      <GameGridSkeleton count={24} />
      <SkeletonBlock className="h-9 w-full" />
    </div>
  );
}

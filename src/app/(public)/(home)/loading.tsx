import { GameGridSkeleton, SkeletonBlock } from "@/components/game/game-card-skeleton";

export default function HomeLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">Ana sayfa yükleniyor</span>
      <section className="py-4">
        <SkeletonBlock className="h-9 w-full max-w-md" />
        <div className="mt-3 space-y-2">
          <SkeletonBlock className="h-4 w-full max-w-2xl" />
          <SkeletonBlock className="h-4 w-4/5 max-w-xl" />
        </div>
      </section>
      <HomeSectionSkeleton />
      <HomeSectionSkeleton />
      <HomeSectionSkeleton />
      <HomeSectionSkeleton count={10} />
    </div>
  );
}

function HomeSectionSkeleton({ count = 20 }: { count?: number }) {
  return (
    <section className="mb-6">
      <SkeletonBlock className="mb-3 h-7 w-36" />
      <GameGridSkeleton count={count} />
    </section>
  );
}

import { GameGridSkeleton, SkeletonBlock } from "@/components/game/game-card-skeleton";

export default function ProfileLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Profil yükleniyor</span>
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <SkeletonBlock className="size-20 shrink-0" />
          <div className="pt-1">
            <SkeletonBlock className="h-8 w-48 max-w-full" />
            <SkeletonBlock className="mt-2 h-4 w-28" />
          </div>
        </div>
        <SkeletonBlock className="h-9 w-36" />
      </section>
      <ProfileGamesSkeleton titleWidth="w-24" />
      <ProfileGamesSkeleton titleWidth="w-48" />
      <section className="rounded-md border border-border bg-card p-4">
        <SkeletonBlock className="h-7 w-24" />
        <div className="mt-3 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-3 rounded-md border border-border p-3">
              <SkeletonBlock className="aspect-[4/3] w-24 shrink-0 sm:w-28" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex justify-between gap-3">
                  <SkeletonBlock className="h-5 w-40" />
                  <SkeletonBlock className="h-6 w-20" />
                </div>
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileGamesSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <section>
      <SkeletonBlock className={`h-7 ${titleWidth}`} />
      <div className="mt-3">
        <GameGridSkeleton count={5} />
      </div>
    </section>
  );
}

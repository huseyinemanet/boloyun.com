import { GameGridSkeleton, SkeletonBlock } from "@/components/game/game-card-skeleton";

export default function CategoryLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Kategori yükleniyor</span>
      <section>
        <SkeletonBlock className="h-8 w-56 max-w-full" />
        <div className="mt-3 space-y-2">
          <SkeletonBlock className="h-4 w-full max-w-4xl" />
          <SkeletonBlock className="h-4 w-3/4 max-w-2xl" />
        </div>
      </section>
      <div className="flex justify-end gap-1">
        {Array.from({ length: 5 }, (_, index) => <SkeletonBlock key={index} className="size-9" />)}
      </div>
      <section className="mb-6">
        <SkeletonBlock className="mb-3 h-7 w-48" />
        <GameGridSkeleton count={20} />
      </section>
      <div className="flex justify-end gap-1">
        {Array.from({ length: 5 }, (_, index) => <SkeletonBlock key={index} className="size-9" />)}
      </div>
      <nav aria-label="İlgili kategoriler yükleniyor">
        <SkeletonBlock className="h-7 w-52" />
        <div className="mt-3 flex flex-wrap gap-2">
          {["w-28", "w-36", "w-24", "w-32", "w-28", "w-40"].map((width, index) => (
            <SkeletonBlock key={index} className={`h-9 ${width}`} />
          ))}
        </div>
      </nav>
    </div>
  );
}

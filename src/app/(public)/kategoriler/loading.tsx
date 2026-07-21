import { SkeletonBlock } from "@/components/game/game-card-skeleton";

export default function CategoriesLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Oyun kategorileri yükleniyor</span>
      <section className="rounded-md border border-border bg-card p-4">
        <SkeletonBlock className="h-8 w-64 max-w-full" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
      </section>
      <div className="grid gap-2 rounded-md border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 24 }, (_, index) => <SkeletonBlock key={index} className="h-10 w-full" />)}
      </div>
    </div>
  );
}

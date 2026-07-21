export function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function GameCardSkeleton() {
  return (
    <div aria-hidden="true" className="min-w-0">
      <SkeletonBlock className="aspect-[4/3] w-full" />
      <div className="pt-2">
        <SkeletonBlock className="h-5 w-4/5" />
      </div>
    </div>
  );
}

export function GameGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, index) => <GameCardSkeleton key={index} />)}
    </div>
  );
}

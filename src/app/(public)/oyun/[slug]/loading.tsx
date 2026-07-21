function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function GameDetailLoading() {
  return (
    <article aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Oyun yükleniyor</span>

      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="size-3" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-3" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <Skeleton className="aspect-[4/3] w-full md:w-[220px]" />

          <div className="min-w-0">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
              <Skeleton className="h-8 w-52 max-w-full sm:w-72" />
              <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                {Array.from({ length: 8 }, (_, index) => (
                  <Skeleton key={index} className="size-10 rounded-full" />
                ))}
                <Skeleton className="h-10 w-24" />
              </div>
            </div>

            <div className="mt-2 space-y-2">
              <Skeleton className="h-4 w-full max-w-3xl" />
              <Skeleton className="h-4 w-4/5 max-w-2xl" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-3">
              <MetricSkeleton width="w-32" />
              <MetricSkeleton width="w-28" />
              <MetricSkeleton width="w-40" />
            </div>
          </div>
        </div>

        <Skeleton className="player-grid mt-4 aspect-video w-full bg-black/75" />
      </section>

      <section className="grid gap-3 rounded-md border border-border bg-card p-4 md:grid-cols-2">
        <InfoSkeleton lines={4} />
        <InfoSkeleton lines={3} />
        <InfoSkeleton lines={3} />
      </section>

      <div className="flex flex-wrap gap-2">
        {["w-20", "w-24", "w-16", "w-28", "w-20"].map((width, index) => (
          <Skeleton key={index} className={`h-6 ${width}`} />
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-36" />
          <div className="hidden gap-2 sm:flex">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </section>
    </article>
  );
}

function MetricSkeleton({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Skeleton className="size-4 rounded-full" />
      <Skeleton className={`h-4 ${width}`} />
    </div>
  );
}

function InfoSkeleton({ lines }: { lines: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Skeleton className="size-[18px] rounded-full" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={`h-4 ${index === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

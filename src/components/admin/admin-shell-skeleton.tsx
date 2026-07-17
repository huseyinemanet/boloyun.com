function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export function AdminShellSkeleton() {
  return (
    <main id="main-content" aria-busy="true" aria-live="polite" className="mx-auto w-full px-3 py-3 md:px-4">
      <span className="sr-only">Yönetim paneli yükleniyor</span>
      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
        <AdminSidebarSkeleton />
        <AdminContentSkeleton />
      </div>
    </main>
  );
}

export function AdminContentSkeleton() {
  return (
    <div className="min-w-0 space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yönetim içeriği yükleniyor</span>
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-44" />
        <SkeletonBlock className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-md border border-border bg-card p-4">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-3 h-8 w-24" />
          </div>
        ))}
      </div>
      <section className="overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border bg-muted/40 p-4">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="mt-2 h-3 w-full max-w-sm" />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px] divide-y divide-border">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="grid grid-cols-[56px_minmax(180px,1fr)_repeat(5,80px)] items-center gap-4 px-3 py-3">
                <SkeletonBlock className="h-5 w-8" />
                <div className="flex min-w-0 items-center gap-3">
                  <SkeletonBlock className="h-10 w-[72px]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-full max-w-64" />
                    <SkeletonBlock className="h-3 w-28" />
                  </div>
                </div>
                {Array.from({ length: 5 }, (_, metricIndex) => (
                  <SkeletonBlock key={metricIndex} className="mx-auto h-4 w-10" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminSidebarSkeleton() {
  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
      <SkeletonBlock className="h-11 w-full lg:hidden" />
      <nav className="hidden gap-0.5 lg:grid" aria-hidden="true">
        {Array.from({ length: 11 }, (_, index) => (
          <div key={index} className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <SkeletonBlock className="size-6 shrink-0" />
            <SkeletonBlock className={index === 6 ? "h-4 w-28" : "h-4 w-20"} />
          </div>
        ))}
      </nav>
    </aside>
  );
}

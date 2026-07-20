"use client";

import { usePathname } from "next/navigation";
import { getAdminSkeletonVariant } from "@/components/admin/admin-skeleton-variant";

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
  const pathname = usePathname();
  const variant = getAdminSkeletonVariant(pathname);

  return (
    <div className="min-w-0" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yönetim içeriği yükleniyor</span>
      {variant === "overview" ? <OverviewSkeleton /> : null}
      {variant === "crawler" ? <CrawlerSkeleton /> : null}
      {variant === "imports" ? <ImportsSkeleton /> : null}
      {variant === "management" ? <ManagementSkeleton /> : null}
      {variant === "ads" ? <AdsSkeleton /> : null}
      {variant === "ai" ? <AiSkeleton /> : null}
      {variant === "settings" ? <SettingsSkeleton /> : null}
      {variant === "table" ? <TablePageSkeleton pathname={pathname} /> : null}
    </div>
  );
}

function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-2 pb-3">
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBlock className="h-8 w-44" />
        <SkeletonBlock className="h-4 w-full max-w-lg" />
      </div>
      {action ? <SkeletonBlock className="h-10 w-40 shrink-0" /> : null}
    </header>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <PanelSkeleton className="p-4">
        <SkeletonBlock className="h-5 w-40" />
        <div className="mt-4 flex flex-col items-center gap-2 py-2">
          <SkeletonBlock className="size-6 rounded-full" />
          <SkeletonBlock className="h-4 w-44" />
          <SkeletonBlock className="h-3 w-64 max-w-full" />
        </div>
      </PanelSkeleton>
      <section>
        <SkeletonBlock className="mb-2 h-5 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => <MetricCardSkeleton key={index} />)}
        </div>
      </section>
      <PanelSkeleton className="p-4">
        <SkeletonBlock className="h-5 w-28" />
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <SkeletonBlock className="size-5 shrink-0" />
              <div className="space-y-2"><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-5 w-16" /></div>
            </div>
          ))}
        </div>
      </PanelSkeleton>
      <div className="grid gap-3 xl:grid-cols-2">
        <ListPanelSkeleton rows={5} />
        <ListPanelSkeleton rows={8} />
      </div>
    </div>
  );
}

function TablePageSkeleton({ pathname }: { pathname: string }) {
  const hasAction = pathname.startsWith("/admin/users") || pathname.startsWith("/admin/static-pages");
  const isGames = pathname.startsWith("/admin/games");

  return (
    <div className="space-y-3">
      <PageHeaderSkeleton action={hasAction} />
      {isGames ? <SummaryBarSkeleton /> : <TabsSkeleton />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SkeletonBlock className="h-10 w-full max-w-sm" />
          {!isGames ? <SkeletonBlock className="h-10 w-36" /> : null}
        </div>
        <SkeletonBlock className="h-10 w-24" />
      </div>
      {!isGames ? <div className="flex items-center justify-between gap-3"><SkeletonBlock className="h-10 w-64" /><SkeletonBlock className="h-4 w-20" /></div> : null}
      <TableSkeleton rows={isGames ? 8 : 6} columns={isGames ? 5 : 7} />
    </div>
  );
}

function CrawlerSkeleton() {
  return (
    <div className="space-y-3">
      <PageHeaderSkeleton />
      <PanelSkeleton className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldSkeleton className="md:col-span-2" />
          <FieldSkeleton />
          <FieldSkeleton />
          <div className="flex items-center gap-2 md:col-span-2"><SkeletonBlock className="size-4" /><SkeletonBlock className="h-4 w-72 max-w-full" /></div>
          <SkeletonBlock className="h-10 w-40 md:col-span-2" />
        </div>
      </PanelSkeleton>
    </div>
  );
}

function ImportsSkeleton() {
  return (
    <div className="space-y-3">
      <PageHeaderSkeleton />
      <TabsSkeleton count={5} />
      <SummaryBarSkeleton />
      <TableSkeleton rows={6} columns={4} />
      <SummaryBarSkeleton />
    </div>
  );
}

function ManagementSkeleton() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <PanelSkeleton className="h-fit space-y-4 p-4">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-3 w-52" />
          {Array.from({ length: 5 }, (_, index) => <FieldSkeleton key={index} />)}
          <SkeletonBlock className="h-10 w-full" />
        </PanelSkeleton>
        <div className="space-y-3">
          <div className="flex items-center gap-2"><SkeletonBlock className="h-10 flex-1" /><SkeletonBlock className="h-10 w-20" /></div>
          <SummaryBarSkeleton plain />
          <TableSkeleton rows={7} columns={4} />
        </div>
      </div>
    </div>
  );
}

function AdsSkeleton() {
  return (
    <div className="space-y-3">
      <PageHeaderSkeleton />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <PanelSkeleton className="overflow-hidden">
          <PanelHeaderSkeleton action />
          <TableRowsSkeleton rows={9} columns={5} />
        </PanelSkeleton>
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, index) => (
            <PanelSkeleton key={index} className="space-y-4 p-4">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-3 w-full max-w-xs" />
              {Array.from({ length: index ? 5 : 3 }, (__, fieldIndex) => <FieldSkeleton key={fieldIndex} />)}
            </PanelSkeleton>
          ))}
        </div>
      </div>
      <PanelSkeleton className="overflow-hidden">
        <PanelHeaderSkeleton />
        <div className="space-y-3 p-3"><SkeletonBlock className="h-10 w-full max-w-sm" /><TableRowsSkeleton rows={4} columns={5} /></div>
      </PanelSkeleton>
    </div>
  );
}

function AiSkeleton() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <PanelSkeleton className="p-4">
        <div className="flex items-start justify-between gap-3"><div className="space-y-2"><SkeletonBlock className="h-6 w-40" /><SkeletonBlock className="h-4 w-96 max-w-full" /></div><SkeletonBlock className="h-6 w-16" /></div>
        <SkeletonBlock className="mt-5 h-3 w-full rounded-full" />
        <div className="mt-5 flex flex-wrap gap-8">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-3"><SkeletonBlock className="size-8" /><div className="space-y-2"><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-6 w-28" /></div></div>)}
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4"><SkeletonBlock className="h-10 w-24" /></div>
      </PanelSkeleton>
      <PanelSkeleton className="overflow-hidden"><PanelHeaderSkeleton /><TableRowsSkeleton rows={8} columns={5} /></PanelSkeleton>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-3">
      <PageHeaderSkeleton />
      <div className="flex gap-2 overflow-hidden"><SkeletonBlock className="h-10 w-28 shrink-0" />{Array.from({ length: 6 }, (_, index) => <SkeletonBlock key={index} className="h-10 w-24 shrink-0" />)}</div>
      <PanelSkeleton className="space-y-5 p-4">
        <div className="space-y-2"><SkeletonBlock className="h-6 w-36" /><SkeletonBlock className="h-3 w-80 max-w-full" /></div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => <FieldSkeleton key={index} className={index % 3 === 0 ? "md:col-span-2" : ""} />)}
        </div>
        <div className="flex justify-end border-t border-border pt-4"><SkeletonBlock className="h-10 w-28" /></div>
      </PanelSkeleton>
    </div>
  );
}

function MetricCardSkeleton() {
  return <PanelSkeleton className="space-y-3 p-4"><SkeletonBlock className="h-4 w-48 max-w-full" /><SkeletonBlock className="h-8 w-20" /></PanelSkeleton>;
}

function ListPanelSkeleton({ rows }: { rows: number }) {
  return (
    <PanelSkeleton className="p-4">
      <SkeletonBlock className="h-5 w-32" />
      <div className="mt-3 divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-3 py-2"><SkeletonBlock className="size-6 shrink-0" /><SkeletonBlock className="h-4 flex-1" /><SkeletonBlock className="h-4 w-16" /></div>)}
      </div>
    </PanelSkeleton>
  );
}

function TabsSkeleton({ count = 4 }: { count?: number }) {
  return <div className="flex gap-3 overflow-hidden">{Array.from({ length: count }, (_, index) => <SkeletonBlock key={index} className="h-8 w-24 shrink-0" />)}</div>;
}

function SummaryBarSkeleton({ plain = false }: { plain?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${plain ? "py-1" : "rounded-md border border-border bg-card px-3 py-2"}`}><SkeletonBlock className="h-4 w-44" /><SkeletonBlock className="h-8 w-40" /></div>;
}

function TableSkeleton({ rows, columns }: { rows: number; columns: number }) {
  return <PanelSkeleton className="overflow-hidden"><TableRowsSkeleton rows={rows} columns={columns} /></PanelSkeleton>;
}

function TableRowsSkeleton({ rows, columns }: { rows: number; columns: number }) {
  return (
    <div className="min-w-[680px] divide-y divide-border overflow-hidden">
      <div className="grid gap-4 bg-muted/40 px-3 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(72px, 1fr))` }}>
        {Array.from({ length: columns }, (_, index) => <SkeletonBlock key={index} className="h-5 w-8" />)}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="grid items-center gap-4 px-3 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(72px, 1fr))` }}>
          {Array.from({ length: columns }, (__, columnIndex) => <SkeletonBlock key={columnIndex} className={columnIndex === 0 ? "h-10 w-full max-w-40" : "h-4 w-full max-w-24"} />)}
        </div>
      ))}
    </div>
  );
}

function PanelHeaderSkeleton({ action = false }: { action?: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 p-3"><div className="space-y-2"><SkeletonBlock className="h-5 w-32" /><SkeletonBlock className="h-3 w-20" /></div>{action ? <SkeletonBlock className="h-10 w-32" /> : null}</div>;
}

function FieldSkeleton({ className = "" }: { className?: string }) {
  return <div className={`space-y-2 ${className}`}><SkeletonBlock className="h-4 w-28" /><SkeletonBlock className="h-10 w-full" /></div>;
}

function PanelSkeleton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-md border border-border bg-card ${className}`}>{children}</section>;
}

function AdminSidebarSkeleton() {
  const groups = [1, 6, 2, 3];

  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
      <SkeletonBlock className="h-11 w-full lg:hidden" />
      <nav className="hidden gap-3 lg:grid" aria-hidden="true">
        {groups.map((linkCount, groupIndex) => (
          <div key={groupIndex} className="grid gap-0">
            <SkeletonBlock className="mb-1 ml-2 h-3 w-16" />
            {Array.from({ length: linkCount }, (_, linkIndex) => (
              <div key={linkIndex} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                <SkeletonBlock className="size-6 shrink-0" />
                <SkeletonBlock className={groupIndex === 1 && linkIndex === 2 ? "h-4 w-28" : "h-4 w-20"} />
              </div>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

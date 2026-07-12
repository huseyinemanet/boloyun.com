"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AiTranslationActivity, AiTranslationJob, AiTranslationStats } from "@/lib/ai/types";

type ActivityPayload = {
  stats: AiTranslationStats;
  jobs: AiTranslationJob[];
  activity: AiTranslationActivity[];
  serverTime: string;
  error?: string;
};

type RealtimeActivityPanelProps = {
  initialStats: AiTranslationStats;
  initialJobs: AiTranslationJob[];
  initialActivity: AiTranslationActivity[];
};

type ActivityTableRow = AiTranslationActivity & {
  isActuallyProcessing: boolean;
};

const activityColumnLabels: Record<string, string> = {
  updatedAt: "Zaman",
  status: "Durum",
  title: "Oyun",
  attempts: "Deneme",
  errorMessage: "Hata",
};

const activityColumnWidths: Record<string, string> = {
  updatedAt: "w-44",
  status: "w-36",
  title: "w-[320px]",
  attempts: "w-28",
  errorMessage: "w-[360px]",
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export function RealtimeActivityPanel({ initialStats, initialJobs, initialActivity }: RealtimeActivityPanelProps) {
  const [payload, setPayload] = useState<ActivityPayload>({
    stats: initialStats,
    jobs: initialJobs,
    activity: initialActivity,
    serverTime: initialActivity[0]?.updatedAt ?? initialJobs[0]?.updatedAt ?? "1970-01-01T00:00:00.000Z",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const previousStatuses = useRef(new Map(initialActivity.map((item) => [item.id, item.status])));
  const consecutiveErrors = useRef(0);

  const runningJobIds = useMemo(() => new Set(payload.jobs.filter((job) => job.status === "running").map((job) => job.id)), [payload.jobs]);
  const hasRunningWork = runningJobIds.size > 0;
  const hasQueuedWork = payload.jobs.some((job) => job.status === "queued");
  const activityLabel = hasRunningWork ? "İşleniyor" : hasQueuedWork ? "Hazır" : "Durakladı";
  const activityRows = useMemo<ActivityTableRow[]>(
    () => payload.activity.map((item) => ({
      ...item,
      isActuallyProcessing: item.status === "processing" && runningJobIds.has(item.jobId),
    })),
    [payload.activity, runningJobIds],
  );
  const activityColumns = useMemo<ColumnDef<ActivityTableRow>[]>(() => [
    {
      accessorKey: "updatedAt",
      header: "Zaman",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.updatedAt)}</span>,
    },
    {
      accessorKey: "status",
      header: "Durum",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "completed" ? "default" : row.original.status === "failed" ? "destructive" : "outline"}>
          {itemStatusText(row.original.status, row.original.isActuallyProcessing)}
        </Badge>
      ),
      filterFn: (row, columnId, filterValue) => filterValue === "all" || row.getValue(columnId) === filterValue,
    },
    {
      accessorKey: "title",
      header: "Oyun",
      cell: ({ row }) => <span className="block truncate font-semibold">{row.original.title}</span>,
    },
    {
      accessorKey: "attempts",
      header: "Deneme",
      cell: ({ row }) => row.original.attempts,
    },
    {
      accessorKey: "errorMessage",
      header: "Hata",
      cell: ({ row }) => <span className="block truncate text-muted-foreground">{row.original.errorMessage ?? "-"}</span>,
    },
  ], []);

  // TanStack Table exposes mutable functions that React Compiler intentionally does not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const activityTable = useReactTable({
    data: activityRows,
    columns: activityColumns,
    getRowId: (row) => row.id,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLocaleLowerCase("tr");
      if (!query) return true;

      const item = row.original;
      return [
        item.title,
        itemStatusText(item.status, item.isActuallyProcessing),
        item.status,
        item.errorMessage ?? "",
      ].join(" ").toLocaleLowerCase("tr").includes(query);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });
  const statusFilter = String(activityTable.getColumn("status")?.getFilterValue() ?? "all");
  const filteredCount = activityTable.getFilteredRowModel().rows.length;

  useEffect(() => {
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function refresh() {
      setIsRefreshing(true);
      const controller = new AbortController();
      const abortTimeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/api/admin/ai/activity", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = await response.json() as ActivityPayload;
        if (next.error) throw new Error(next.error);
        if (!Array.isArray(next.jobs) || !Array.isArray(next.activity) || !next.stats) throw new Error("Aktivite yanıtı eksik döndü.");
        if (disposed) return;
        logTransitions(previousStatuses.current, next.activity);
        previousStatuses.current = new Map(next.activity.map((item) => [item.id, item.status]));
        setPayload(next);
        consecutiveErrors.current = 0;
        setLastError(null);
      } catch (error) {
        if (!disposed) {
          consecutiveErrors.current += 1;
          setLastError(error instanceof Error ? error.message : "Aktivite okunamadı.");
        }
      } finally {
        clearTimeout(abortTimeout);
        if (!disposed) {
          setIsRefreshing(false);
          const errorDelay = Math.min(30000, 5000 * Math.max(1, consecutiveErrors.current));
          const nextDelay = consecutiveErrors.current ? errorDelay : hasRunningWork ? 2500 : 5000;
          timeout = setTimeout(refresh, nextDelay);
        }
      }
    }

    timeout = setTimeout(refresh, 900);
    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [hasRunningWork]);

  const activeJob = payload.jobs.find((job) => job.status === "running") ?? payload.jobs.find((job) => job.status === "queued") ?? payload.jobs[0];

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <style>{`
        @keyframes ai-row-shimmer {
          0% { transform: translateX(-120%); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(160%); opacity: 0; }
        }
        .ai-processing-row {
          position: relative;
          overflow: hidden;
          background: color-mix(in srgb, var(--primary) 10%, transparent);
        }
        .ai-processing-row::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 55%;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 30%, white 30%), transparent);
          animation: ai-row-shimmer 1.35s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Son AI İşlem Logları</h2>
          <p className="mt-1 text-sm text-muted-foreground">İşlenen satır parlayarak gösterilir; duraklatılan işlerde animasyon durur.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="relative flex items-center gap-2">
            <span className={hasRunningWork ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-muted-foreground/50"} />
            {activityLabel}
          </span>
          <span>{isRefreshing ? "Yenileniyor..." : formatDate(payload.serverTime)}</span>
        </div>
      </div>

      {activeJob ? (
        <div className="mt-4 grid gap-3 rounded-md border border-border bg-background/40 p-3 text-sm sm:grid-cols-4">
          <Metric label="Aktif iş" value={`${activeJob.completedCount}/${activeJob.totalCount}`} />
          <Metric label="Durum" value={jobStatusText(activeJob.status)} />
          <Metric label="Hata" value={String(activeJob.failedCount)} tone={activeJob.failedCount ? "danger" : "muted"} />
          <Metric label="Bekleyen" value={String(Math.max(0, activeJob.totalCount - activeJob.completedCount - activeJob.failedCount))} />
        </div>
      ) : null}

      {lastError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Canlı log okunamadı: {lastError}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Input
              type="search"
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder="Loglarda ara..."
              aria-label="AI işlem loglarında ara"
              className="w-full sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={(value) => activityTable.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)}>
              <SelectTrigger className="w-[170px]" aria-label="Log durumunu filtrele">
                <SelectValue placeholder="Tüm durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm durumlar</SelectItem>
                <SelectItem value="pending">Bekliyor</SelectItem>
                <SelectItem value="processing">İşleniyor</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="failed">Hatalı</SelectItem>
                <SelectItem value="skipped">Atlandı</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Sütunlar
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {activityTable.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                >
                  {activityColumnLabels[column.id] ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <Table className="min-w-[900px] table-fixed">
            <TableHeader className="bg-muted/40">
              {activityTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={activityColumnWidths[header.column.id]}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {activityTable.getRowModel().rows.length ? activityTable.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={row.original.isActuallyProcessing ? "ai-processing-row" : ""}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-normal">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={activityTable.getVisibleLeafColumns().length} className="h-28 text-center font-semibold text-muted-foreground">
                    {payload.activity.length === 0 ? "Henüz item logu yok." : "Filtrelerle eşleşen log bulunamadı."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">
            {filteredCount.toLocaleString("tr-TR")} kayıt
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Sayfa {activityTable.getState().pagination.pageIndex + 1} / {Math.max(activityTable.getPageCount(), 1)}
            </span>
            <Button variant="outline" size="sm" onClick={() => activityTable.previousPage()} disabled={!activityTable.getCanPreviousPage()}>Önceki</Button>
            <Button variant="outline" size="sm" onClick={() => activityTable.nextPage()} disabled={!activityTable.getCanNextPage()}>Sonraki</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "danger" }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={tone === "danger" ? "mt-1 text-lg font-black text-destructive" : "mt-1 text-lg font-black"}>{value}</p>
    </div>
  );
}

function logTransitions(previous: Map<string, AiTranslationActivity["status"]>, activity: AiTranslationActivity[]) {
  const changed = activity
    .filter((item) => previous.has(item.id) && previous.get(item.id) !== item.status)
    .map((item) => ({ title: item.title, from: previous.get(item.id), to: item.status, attempts: item.attempts, error: item.errorMessage }));
  if (changed.length) {
    console.groupCollapsed("[ai-translation] realtime.transitions");
    console.table(changed);
    console.groupEnd();
  }
}

function itemStatusText(status: AiTranslationActivity["status"], isActuallyProcessing: boolean) {
  if (status === "processing" && !isActuallyProcessing) return "Yarım kaldı";
  const labels: Record<AiTranslationActivity["status"], string> = {
    pending: "Bekliyor",
    processing: "İşleniyor",
    completed: "Tamamlandı",
    failed: "Hatalı",
    skipped: "Atlandı",
  };
  return labels[status];
}

function jobStatusText(status: AiTranslationJob["status"]) {
  const labels: Record<AiTranslationJob["status"], string> = {
    queued: "Sırada",
    running: "Çalışıyor",
    paused: "Durakladı",
    completed: "Tamamlandı",
    failed: "Başarısız",
    cancelled: "İptal",
  };
  return labels[status];
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

"use client";

import { useMemo, useState } from "react";
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
import { AI_PROVIDER_LABELS, type AiTranslationJob } from "@/lib/ai/types";
import { pauseTranslationJobAction, resumeTranslationJobAction } from "./actions";
import { JobActionForm } from "./job-action-form";

type AiJobsTableProps = {
  jobs: AiTranslationJob[];
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

const columnLabels: Record<string, string> = {
  status: "Durum",
  provider: "Provider",
  progress: "İlerleme",
  createdAt: "Oluşturma",
  actions: "İşlem",
};

const columnWidths: Record<string, string> = {
  status: "w-36",
  provider: "w-72",
  progress: "w-48",
  createdAt: "w-48",
  actions: "w-44 text-right",
};

export function AiJobsTable({ jobs }: AiJobsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<AiTranslationJob>[]>(() => [
    {
      accessorKey: "status",
      header: "Durum",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "completed" ? "default" : row.original.status === "failed" ? "destructive" : "outline"}>
          {jobStatusText(row.original.status)}
        </Badge>
      ),
      filterFn: (row, columnId, filterValue) => filterValue === "all" || row.getValue(columnId) === filterValue,
    },
    {
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-semibold">{AI_PROVIDER_LABELS[row.original.provider]}</p>
          <p className="truncate text-xs font-semibold text-muted-foreground">{row.original.model}</p>
        </div>
      ),
    },
    {
      id: "progress",
      header: "İlerleme",
      accessorFn: (job) => job.completedCount,
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="font-medium">
            {job.completedCount.toLocaleString("tr-TR")} / {job.totalCount.toLocaleString("tr-TR")}
            {job.failedCount ? <span className="ml-2 text-xs font-semibold text-destructive">Hata: {job.failedCount}</span> : null}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Oluşturma",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: "actions",
      header: "İşlem",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="flex justify-end gap-2">
            {job.status === "paused" ? <JobActionForm action={resumeTranslationJobAction} jobId={job.id} label="Devam" jobStatus={job.status} /> : null}
            {job.status === "queued" || job.status === "running" ? <JobActionForm jobId={job.id} label="İşle" jobStatus={job.status} /> : null}
            {job.status === "queued" || job.status === "running" ? (
              <JobActionForm action={pauseTranslationJobAction} jobId={job.id} label="Duraklat" jobStatus={job.status} variant="outline" />
            ) : null}
          </div>
        );
      },
    },
  ], []);

  // TanStack Table exposes mutable functions that React Compiler intentionally does not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: jobs,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLocaleLowerCase("tr");
      if (!query) return true;

      const job = row.original;
      return [
        AI_PROVIDER_LABELS[job.provider],
        job.provider,
        job.model,
        jobStatusText(job.status),
        job.status,
      ].join(" ").toLocaleLowerCase("tr").includes(query);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const statusFilter = String(table.getColumn("status")?.getFilterValue() ?? "all");
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="İşlerde ara..."
            aria-label="Çeviri işlerinde ara"
            className="w-full sm:max-w-sm"
          />
          <Select value={statusFilter} onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-[170px]" aria-label="İş durumunu filtrele">
              <SelectValue placeholder="Tüm durumlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              <SelectItem value="queued">Sırada</SelectItem>
              <SelectItem value="running">Çalışıyor</SelectItem>
              <SelectItem value="paused">Durakladı</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
              <SelectItem value="failed">Başarısız</SelectItem>
              <SelectItem value="cancelled">İptal</SelectItem>
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
            {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
              >
                {columnLabels[column.id] ?? column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table className="min-w-[880px] table-fixed">
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={columnWidths[header.column.id]}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-normal">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-28 text-center font-semibold text-muted-foreground">
                  {jobs.length === 0 ? "Henüz çeviri işi yok." : "Filtrelerle eşleşen iş bulunamadı."}
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
            Sayfa {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Önceki</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Sonraki</Button>
        </div>
      </div>
    </div>
  );
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

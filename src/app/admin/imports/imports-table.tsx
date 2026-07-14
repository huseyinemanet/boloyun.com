"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDownIcon } from "lucide-react";
import { IconInboxStackFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconInboxStackFillDuo18";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ScrapedGameImport } from "@/import/db/game-imports";
import { approveImportByIdAction, approveImportIdsAction, updateImportStatusAction } from "./actions";
import { canPublishImport, getImportColumns, getImportTitle } from "./columns";
import { ImportsToolbar } from "./imports-toolbar";

const columnLabels: Record<string, string> = {
  thumbnail: "Görsel",
  title: "Oyun",
  source: "Kaynak",
  detected_game_type: "Tip",
  import_status: "Durum",
  player: "Player",
};

const columnWidths: Record<string, string> = {
  select: "w-12",
  thumbnail: "w-24",
  source: "w-40",
  detected_game_type: "w-24",
  import_status: "w-40",
  player: "w-32",
  actions: "w-16",
};

const statusSuccessMessages: Record<"rejected" | "needs_fix", string> = {
  rejected: "Oyun reddedildi.",
  needs_fix: "Oyun düzeltme gerekli olarak işaretlendi.",
};

export function ImportsTable({ imports }: { imports: ScrapedGameImport[] }) {
  const router = useRouter();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ScrapedGameImport["import_status"]>>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const data = useMemo(
    () => imports
      .filter((item) => !hiddenIds.has(item.id))
      .map((item) => ({ ...item, import_status: statusOverrides[item.id] ?? item.import_status })),
    [hiddenIds, imports, statusOverrides],
  );

  const approveOne = useCallback(async (item: ScrapedGameImport) => {
    if (!canPublishImport(item) || pendingIds.has(item.id)) return;

    setErrorMessage(null);
    setPendingIds((current) => new Set(current).add(item.id));
    setHiddenIds((current) => new Set(current).add(item.id));
    setRowSelection((current) => withoutRowIds(current, [item.id]));

    try {
      await approveImportByIdAction(item.id);
      toast.success("Oyun yayınlandı.", {
        description: getImportTitle(item),
      });
      router.refresh();
    } catch (error) {
      setHiddenIds((current) => withoutSetIds(current, [item.id]));
      const message = error instanceof Error ? error.message : "Oyun yayınlanamadı.";
      setErrorMessage(message);
      toast.error("Oyun yayınlanamadı.", {
        description: message,
      });
    } finally {
      setPendingIds((current) => withoutSetIds(current, [item.id]));
    }
  }, [pendingIds, router]);

  const updateStatus = useCallback(async (item: ScrapedGameImport, status: "rejected" | "needs_fix") => {
    if (pendingIds.has(item.id)) return;

    const previousStatus = statusOverrides[item.id];
    setErrorMessage(null);
    setPendingIds((current) => new Set(current).add(item.id));
    setStatusOverrides((current) => ({ ...current, [item.id]: status }));
    setRowSelection((current) => withoutRowIds(current, [item.id]));

    try {
      await updateImportStatusAction(item.id, status);
      toast.success(statusSuccessMessages[status], {
        description: getImportTitle(item),
      });
      router.refresh();
    } catch (error) {
      setStatusOverrides((current) => {
        const next = { ...current };
        if (previousStatus) next[item.id] = previousStatus;
        else delete next[item.id];
        return next;
      });
      const message = error instanceof Error ? error.message : "Import durumu güncellenemedi.";
      setErrorMessage(message);
      toast.error("Import durumu güncellenemedi.", {
        description: message,
      });
    } finally {
      setPendingIds((current) => withoutSetIds(current, [item.id]));
    }
  }, [pendingIds, router, statusOverrides]);

  const columns = useMemo(
    () => getImportColumns({ pendingIds, onApprove: approveOne, onStatusChange: updateStatus }),
    [approveOne, pendingIds, updateStatus],
  );

  // TanStack Table exposes mutable functions that React Compiler intentionally does not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: (row) => canPublishImport(row.original) && !pendingIds.has(row.original.id),
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLocaleLowerCase("tr");
      if (!query) return true;

      const item = row.original;
      return [
        getImportTitle(item),
        item.ai_short_description_tr,
        item.original_description,
        item.source_domain,
        item.source_url,
        item.detected_game_type,
        item.import_status,
      ].join(" ").toLocaleLowerCase("tr").includes(query);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedPublishableIds = table.getSelectedRowModel().rows
    .filter((row) => canPublishImport(row.original))
    .map((row) => row.original.id);
  const statusFilter = String(table.getColumn("import_status")?.getFilterValue() ?? "all");

  const selectAllPublishable = useCallback(() => {
    const nextSelection: RowSelectionState = {};
    for (const row of table.getFilteredRowModel().rows) {
      if (row.getCanSelect()) nextSelection[row.id] = true;
    }
    setRowSelection(nextSelection);
  }, [table]);

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  async function approveSelected() {
    const ids = selectedPublishableIds;
    if (ids.length === 0 || isBulkPublishing) return;

    setErrorMessage(null);
    setIsBulkPublishing(true);
    setPendingIds((current) => new Set([...current, ...ids]));

    try {
      const results = await approveImportIdsAction(ids);
      const successfulIds = results.filter((result) => result.ok).map((result) => result.id);
      const failedResults = results.filter((result) => !result.ok);

      setHiddenIds((current) => new Set([...current, ...successfulIds]));
      setRowSelection({});

      if (failedResults.length > 0) {
        const message = successfulIds.length > 0
          ? `${successfulIds.length} oyun yayınlandı, ${failedResults.length} oyun yayınlanamadı. İlk hata: ${failedResults[0]?.error}`
          : `Seçilen oyunlar yayınlanamadı. İlk hata: ${failedResults[0]?.error}`;
        setErrorMessage(message);
        toast.warning(successfulIds.length > 0 ? "Toplu yayınlama kısmen tamamlandı." : "Toplu yayınlama tamamlanamadı.", {
          description: message,
        });
      } else {
        toast.success("Seçilen oyunlar yayınlandı.", {
          description: `${successfulIds.length} oyun yayına alındı.`,
        });
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Seçilen oyunlar yayınlanamadı.";
      setErrorMessage(message);
      toast.error("Seçilen oyunlar yayınlanamadı.", {
        description: message,
      });
    } finally {
      setPendingIds((current) => withoutSetIds(current, ids));
      setIsBulkPublishing(false);
    }
  }

  if (imports.length === 0) {
    return (
      <Empty className="border border-border py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-xl bg-primary/10 text-primary">
            <IconInboxStackFillDuo18 className="size-6" />
          </EmptyMedia>
          <EmptyTitle>Onay bekleyen oyun yok.</EmptyTitle>
          <EmptyDescription>Yeni bulunan oyunlar burada görünecek.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Oyun ara..."
            aria-label="Onay kuyruğunda ara"
            className="w-full sm:max-w-sm"
          />
          <Select value={statusFilter} onValueChange={(value) => table.getColumn("import_status")?.setFilterValue(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-[190px]" aria-label="Import durumunu filtrele">
              <SelectValue placeholder="Tüm durumlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              <SelectItem value="scraped">Taranmış</SelectItem>
              <SelectItem value="ai_generated">AI içeriği hazır</SelectItem>
              <SelectItem value="pending_review">Onay bekliyor</SelectItem>
              <SelectItem value="needs_fix">Düzeltme gerekli</SelectItem>
              <SelectItem value="failed">Başarısız</SelectItem>
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
          <DropdownMenuContent align="end" className="w-48">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ImportsToolbar disabled={isBulkPublishing} onClearSelection={clearSelection} onSelectAll={selectAllPublishable} />
          <Button
            type="button"
            onClick={() => void approveSelected()}
            disabled={selectedPublishableIds.length === 0 || isBulkPublishing}
            className="font-bold"
          >
            {isBulkPublishing ? "Yayınlanıyor..." : `Seçilenleri Yayınla${selectedPublishableIds.length > 0 ? ` (${selectedPublishableIds.length})` : ""}`}
          </Button>
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          {table.getFilteredRowModel().rows.length.toLocaleString("tr-TR")} oyun
        </p>
      </div>

      {errorMessage ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{errorMessage}</p> : null}

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <Table className="min-w-[1080px] table-fixed">
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
              <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined} className="align-top">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-normal">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-28 text-center font-medium text-muted-foreground">
                  {imports.length === 0 ? "Onay bekleyen oyun yok." : "Filtrelere uygun oyun bulunamadı."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      {table.getFilteredRowModel().rows.length > 0 ? (
        <p className="text-sm text-muted-foreground">{selectedPublishableIds.length} oyun seçildi</p>
      ) : null}
    </div>
  );
}

function withoutSetIds(ids: Set<string>, idsToRemove: string[]) {
  const next = new Set(ids);
  for (const id of idsToRemove) next.delete(id);
  return next;
}

function withoutRowIds(selection: RowSelectionState, idsToRemove: string[]) {
  const next = { ...selection };
  for (const id of idsToRemove) delete next[id];
  return next;
}

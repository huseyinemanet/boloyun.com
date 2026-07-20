"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDownIcon } from "lucide-react";
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
import type { AdRow, AdSlotRow } from "@/lib/db-ads";
import { getAdColumns, type AdTableRow } from "./columns";

const columnLabels: Record<string, string> = {
  name: "Reklam",
  slot: "Slot",
  priority: "Öncelik",
  device: "Cihaz",
  status: "Durum",
};

const columnWidths: Record<string, string> = {
  slot: "w-64",
  priority: "w-28",
  device: "w-44",
  status: "w-28",
  actions: "w-16",
};

export function AdsTable({ ads, slots }: { ads: AdRow[]; slots: AdSlotRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "priority", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const data = useMemo<AdTableRow[]>(() => {
    const slotMap = new Map(slots.map((slot) => [slot.id, slot]));

    return ads.map((ad) => {
      const slot = slotMap.get(ad.slot_id);
      return {
        ...ad,
        slotName: slot?.name ?? "Bilinmeyen slot",
        slotKey: slot?.key ?? ad.slot_id,
      };
    });
  }, [ads, slots]);
  const columns = useMemo(() => getAdColumns(), []);

  // TanStack Table exposes mutable functions that React Compiler intentionally does not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
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

      const ad = row.original;
      return [
        ad.name,
        ad.ad_code,
        ad.slotName,
        ad.slotKey,
        ad.is_active !== false ? "aktif" : "pasif",
        ad.show_desktop !== false ? "masaüstü desktop" : "",
        ad.show_mobile !== false ? "mobil" : "",
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
  const emptyMessage = ads.length === 0 ? "Henüz reklam eklenmedi." : "Filtrelerle eşleşen reklam bulunamadı.";

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Reklamlarda ara..."
            aria-label="Reklamlarda ara"
            className="w-full sm:max-w-sm"
          />
          <Select value={statusFilter} onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-[170px]" aria-label="Reklam durumunu filtrele">
              <SelectValue placeholder="Tüm durumlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Pasif</SelectItem>
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

      <div className="flex items-center justify-end text-sm font-semibold text-muted-foreground">
        {filteredCount > 0 ? `${filteredCount.toLocaleString("tr-TR")} reklam` : emptyMessage}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table className="min-w-[920px] table-fixed">
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
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-28 text-center font-medium text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filteredCount > 0 ? `Toplam ${filteredCount.toLocaleString("tr-TR")} reklam` : emptyMessage}
        </p>
        {table.getPageCount() > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Sayfa {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Önceki</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Sonraki</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminComment, AdminCommentCounts, AdminCommentFilter } from "@/lib/db-comments";
import { approveCommentAction, bulkDeleteTrashedCommentsAction, bulkUpdateCommentsAction, deleteTrashedCommentAction, spamCommentAction, trashCommentAction, unapproveCommentAction } from "./actions";
import { getCommentColumns } from "./columns";

const filters: Array<{ key: AdminCommentFilter; label: string }> = [
  { key: "all", label: "Tümü" },
  { key: "pending", label: "Bekleyen" },
  { key: "approved", label: "Onaylı" },
  { key: "spam", label: "Spam" },
  { key: "trash", label: "Çöp" },
];

const bulkActions = [
  { value: "approved", label: "Onayla" },
  { value: "pending", label: "Beklemeye al" },
  { value: "spam", label: "Spam olarak işaretle" },
  { value: "trash", label: "Çöpe taşı" },
] as const;

const columnLabels: Record<string, string> = {
  author: "Yazar",
  body: "Yorum",
  gameTitle: "Yanıtlanan oyun",
  status: "Durum",
  createdAt: "Gönderim",
};

type CommentStatus = "pending" | "approved" | "spam" | "trash";
type BulkActionValue = CommentStatus | "delete";

export function CommentsTable({ comments, counts, activeFilter }: { comments: AdminComment[]; counts: AdminCommentCounts; activeFilter: AdminCommentFilter }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkActionValue>("approved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const data = useMemo(() => comments.filter((comment) => !hiddenIds.has(comment.id)), [comments, hiddenIds]);

  const updateOne = useCallback(async (comment: AdminComment, status: CommentStatus) => {
    if (pendingIds.has(comment.id)) return;

    setErrorMessage(null);
    setPendingIds((current) => new Set(current).add(comment.id));
    if (status === "trash") setHiddenIds((current) => new Set(current).add(comment.id));

    try {
      const action = status === "approved" ? approveCommentAction : status === "pending" ? unapproveCommentAction : status === "spam" ? spamCommentAction : trashCommentAction;
      const formData = createCommentFormData(comment);
      await action(formData);
      toast.success(commentStatusToastMessage(status));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yorum güncellenemedi.");
      setHiddenIds((current) => withoutId(current, comment.id));
      setErrorMessage(error instanceof Error ? error.message : "Yorum güncellenemedi.");
    } finally {
      setPendingIds((current) => withoutId(current, comment.id));
    }
  }, [pendingIds, router]);

  const deleteOne = useCallback(async (comment: AdminComment) => {
    if (pendingIds.has(comment.id)) return;

    setErrorMessage(null);
    setPendingIds((current) => new Set(current).add(comment.id));
    setHiddenIds((current) => new Set(current).add(comment.id));

    try {
      await deleteTrashedCommentAction(createCommentFormData(comment));
      toast.success("Yorum kalıcı olarak silindi.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yorum kalıcı olarak silinemedi.");
      setHiddenIds((current) => withoutId(current, comment.id));
      setErrorMessage(error instanceof Error ? error.message : "Yorum kalıcı olarak silinemedi.");
    } finally {
      setPendingIds((current) => withoutId(current, comment.id));
    }
  }, [pendingIds, router]);

  const columns = useMemo(
    () => getCommentColumns({ activeFilter, pendingIds, onUpdate: updateOne, onDelete: deleteOne }),
    [activeFilter, deleteOne, pendingIds, updateOne],
  );

  // TanStack Table exposes mutable functions that React Compiler intentionally does not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLocaleLowerCase("tr");
      if (!query) return true;

      const comment = row.original;
      return [comment.displayName, comment.username, comment.email, comment.body, comment.gameTitle, comment.status]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(query);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const statusFilter = String(table.getColumn("status")?.getFilterValue() ?? "all");
  const visibleBulkActions = activeFilter === "trash" || statusFilter === "trash"
    ? [...bulkActions, { value: "delete" as const, label: "Kalıcı sil" }]
    : bulkActions;

  async function applyBulkAction() {
    const ids = selectedRows.map((row) => row.original.id);
    if (!ids.length) return;

    setErrorMessage(null);
    setPendingIds((current) => new Set([...current, ...ids]));
    if (bulkAction === "delete" || bulkAction === "trash") setHiddenIds((current) => new Set([...current, ...ids]));

    try {
      if (bulkAction === "delete") await bulkDeleteTrashedCommentsAction(ids);
      else await bulkUpdateCommentsAction(ids, bulkAction);
      toast.success(bulkCommentToastMessage(bulkAction, ids.length));
      setRowSelection({});
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Toplu işlem uygulanamadı.");
      setHiddenIds((current) => withoutIds(current, ids));
      setErrorMessage(error instanceof Error ? error.message : "Toplu işlem uygulanamadı.");
    } finally {
      setPendingIds((current) => withoutIds(current, ids));
    }
  }

  return (
    <div className="space-y-3">
      <Tabs value={activeFilter} className="w-full">
        <TabsList variant="line" aria-label="Yorum filtresi" className="h-auto flex-wrap justify-start gap-3 p-0">
          {filters.map((filter) => (
            <TabsTrigger key={filter.key} value={filter.key} asChild className="h-8 flex-none px-0 text-sm font-bold text-primary data-active:text-foreground">
              <Link href={filter.key === "all" ? "/admin/comments" : `/admin/comments?status=${filter.key}`}>
                {filter.label} <span className="text-muted-foreground">({counts[filter.key]})</span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Yorumlarda ara..."
            aria-label="Yorumlarda ara"
            className="w-full sm:max-w-sm"
          />
          <Select value={statusFilter} onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-[180px]" aria-label="Yorum durumunu filtrele">
              <SelectValue placeholder="Tüm durumlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              <SelectItem value="pending">Bekleyen</SelectItem>
              <SelectItem value="approved">Onaylı</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="trash">Çöp</SelectItem>
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
          <Select value={bulkAction} onValueChange={(value) => setBulkAction(value as BulkActionValue)}>
            <SelectTrigger className="w-[220px]" aria-label="Toplu işlem seç">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleBulkActions.map((action) => <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" disabled={selectedCount === 0} onClick={() => void applyBulkAction()}>
            Uygula
          </Button>
        </div>
        <div className="text-sm font-semibold text-muted-foreground">
          {table.getFilteredRowModel().rows.length.toLocaleString("tr-TR")} kayıt
        </div>
      </div>

      {errorMessage ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{errorMessage}</p> : null}

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <Table className="min-w-[1040px]">
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={row.original.status === "pending" ? "border-l-4 border-l-warning bg-warning/5" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-normal">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-28 text-center font-medium text-muted-foreground">
                  Yorum bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedCount} / {table.getFilteredRowModel().rows.length} satır seçildi
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Sayfa {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <Button variant="outline" size="icon-sm" aria-label="Önceki sayfa" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeftIcon aria-hidden="true" /></Button>
          <Button variant="outline" size="icon-sm" aria-label="Sonraki sayfa" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRightIcon aria-hidden="true" /></Button>
        </div>
      </div>
    </div>
  );
}

function createCommentFormData(comment: AdminComment) {
  const formData = new FormData();
  formData.set("id", comment.id);
  formData.set("slug", comment.gameSlug);
  return formData;
}

function withoutId(values: Set<string>, id: string) {
  const next = new Set(values);
  next.delete(id);
  return next;
}

function withoutIds(values: Set<string>, ids: string[]) {
  const next = new Set(values);
  ids.forEach((id) => next.delete(id));
  return next;
}

function commentStatusToastMessage(status: CommentStatus) {
  if (status === "approved") return "Yorum onaylandı.";
  if (status === "pending") return "Yorum beklemeye alındı.";
  if (status === "spam") return "Yorum spam olarak işaretlendi.";
  return "Yorum çöpe taşındı.";
}

function bulkCommentToastMessage(action: BulkActionValue, count: number) {
  const suffix = `${count.toLocaleString("tr-TR")} yorum`;
  if (action === "delete") return `${suffix} kalıcı olarak silindi.`;
  if (action === "approved") return `${suffix} onaylandı.`;
  if (action === "pending") return `${suffix} beklemeye alındı.`;
  if (action === "spam") return `${suffix} spam olarak işaretlendi.`;
  return `${suffix} çöpe taşındı.`;
}

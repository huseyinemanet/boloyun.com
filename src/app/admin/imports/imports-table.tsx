"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { IconEmptyFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconEmptyFillDuo18";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GameImportStatus } from "@/import/db/game-imports";
import { importStatusLabel } from "@/import/admin/import-status";
import { formatFullDateTime, formatRelativeDateTime } from "@/lib/date-time";

export type ImportTableRow = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  sourceUrl: string;
  sourceDomain: string | null;
  status: GameImportStatus;
  errorMessage: string | null;
  updatedAt: string;
};

export function ImportsTable({ rows, now }: { rows: ImportTableRow[]; now: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const referenceTime = useMemo(() => new Date(now), [now]);
  const columns = useMemo<ColumnDef<ImportTableRow>[]>(() => [
    {
      accessorKey: "title",
      header: "Oyun",
      cell: ({ row }) => <div className="flex min-w-[280px] items-center gap-3">
        {row.original.thumbnailUrl ? <Image src={row.original.thumbnailUrl} alt="" width={48} height={48} unoptimized className="rounded-md object-cover" /> : <div className="size-12 rounded-md bg-muted" />}
        <div className="min-w-0"><Link href={`/admin/imports/${row.original.id}`} className="font-medium text-primary hover:underline">{row.original.title}</Link>{row.original.errorMessage ? <p className="line-clamp-2 text-xs text-destructive">{row.original.errorMessage}</p> : null}</div>
      </div>,
    },
    {
      accessorKey: "sourceDomain",
      header: "Kaynak",
      cell: ({ row }) => <a className="text-sm text-muted-foreground hover:underline" href={row.original.sourceUrl} target="_blank" rel="noreferrer">{row.original.sourceDomain || "Kaynak bağlantısı"}</a>,
    },
    { accessorKey: "status", header: "Durum", cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{importStatusLabel(row.original.status)}</Badge> },
    { accessorKey: "updatedAt", header: "Güncellendi", cell: ({ row }) => <time className="text-sm text-muted-foreground" dateTime={row.original.updatedAt} title={formatFullDateTime(row.original.updatedAt)}>{formatRelativeDateTime(row.original.updatedAt, referenceTime)}</time> },
    { id: "actions", header: "İşlem", cell: ({ row }) => <Button asChild size="sm" variant="outline"><Link href={`/admin/imports/${row.original.id}`}>İncele</Link></Button> },
  ], [referenceTime]);
  // TanStack Table exposes mutable functions that React Compiler intentionally does not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: rows, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getRowId: (row) => row.id });

  if (!rows.length) return <Card size="sm"><CardContent><Empty><EmptyMedia className="text-primary"><IconEmptyFillDuo18 className="size-8" aria-hidden="true" /></EmptyMedia><EmptyHeader><EmptyTitle>Bu filtrede kayıt yok</EmptyTitle><EmptyDescription>Yeni oyun tarayabilir veya başka bir durum filtresine geçebilirsin.</EmptyDescription></EmptyHeader><EmptyContent><Button asChild variant="outline"><Link href="/admin/crawler">Yeni Oyun Tara</Link></Button></EmptyContent></Empty></CardContent></Card>;
  return (
    <Card size="sm"><CardContent className="px-0"><Table>
      <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
      <TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody>
    </Table></CardContent></Card>
  );
}

function statusVariant(status: GameImportStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "failed" || status === "rejected") return "destructive";
  if (status === "pending_review" || status === "needs_fix") return "secondary";
  return "outline";
}

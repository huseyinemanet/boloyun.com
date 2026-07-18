"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDownIcon } from "lucide-react";
import { IconGamepadButtonsFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadButtonsFillDuo18";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { IconMediaPlayFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMediaPlayFillDuo18";
import { IconRankingStarFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconRankingStarFillDuo18";
import { IconStarFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconStarFillDuo18";
import { IconThumbsUpFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconThumbsUpFillDuo18";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type PopularGameTableRow = {
  id: string;
  rank: number;
  title: string;
  categoryName: string;
  thumbnailUrl: string;
  playCount: number;
  favoriteCount: number;
  likesCount: number;
  ratingAvg: number;
  popularityScore: number;
};

const columnWidths: Record<string, string> = {
  rank: "w-20",
  popularityScore: "w-24",
  playCount: "w-24",
  favoriteCount: "w-24",
  likesCount: "w-24",
  ratingAvg: "w-20",
};

export function PopularGamesTable({ games }: { games: PopularGameTableRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(() => getPopularGameColumns(), []);

  // TanStack Table exposes mutable functions that React Compiler intentionally does not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: games,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <Card size="sm">
      <CardHeader><CardTitle>Popüler Oyunlar</CardTitle></CardHeader>
      <CardContent className="px-0">
      <Table className="min-w-[760px] table-fixed">
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
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="whitespace-normal">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </CardContent>
    </Card>
  );
}

function getPopularGameColumns(): ColumnDef<PopularGameTableRow>[] {
  return [
    {
      accessorKey: "rank",
      header: ({ column }) => <SortableHeader column={column} label="Sıra" icon={<IconRankingStarFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <span className="text-base font-bold text-muted-foreground">#{row.original.rank}</span>,
    },
    {
      accessorKey: "title",
      header: ({ column }) => <SortableHeader column={column} label="Oyun" icon={<IconGamepadButtonsFillDuo18 className="size-5" />} />,
      cell: ({ row }) => (
        <div className="flex min-w-[260px] items-center gap-3">
          <Link href={`/admin/games/${row.original.id}/edit`} aria-label={`${row.original.title} oyununu düzenle`} className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Image
              src={row.original.thumbnailUrl}
              alt={row.original.title}
              width={72}
              height={40}
              unoptimized
              className="h-10 w-auto rounded-md object-contain"
              style={{ width: "auto" }}
            />
          </Link>
          <div className="min-w-0">
            <Link href={`/admin/games/${row.original.id}/edit`} className="block truncate font-bold text-primary hover:underline">
              {row.original.title}
            </Link>
            {row.original.categoryName ? <p className="truncate text-xs leading-4 text-muted-foreground">{row.original.categoryName}</p> : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "popularityScore",
      header: ({ column }) => <SortableHeader column={column} label="Skor" icon={<IconRankingStarFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <Metric>{Math.round(row.original.popularityScore).toLocaleString("tr-TR")}</Metric>,
    },
    {
      accessorKey: "playCount",
      header: ({ column }) => <SortableHeader column={column} label="Oynama" icon={<IconMediaPlayFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <Metric>{row.original.playCount.toLocaleString("tr-TR")}</Metric>,
    },
    {
      accessorKey: "favoriteCount",
      header: ({ column }) => <SortableHeader column={column} label="Favori" icon={<IconHeartFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <Metric>{row.original.favoriteCount.toLocaleString("tr-TR")}</Metric>,
    },
    {
      accessorKey: "likesCount",
      header: ({ column }) => <SortableHeader column={column} label="Beğeni" icon={<IconThumbsUpFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <Metric>{row.original.likesCount.toLocaleString("tr-TR")}</Metric>,
    },
    {
      accessorKey: "ratingAvg",
      header: ({ column }) => <SortableHeader column={column} label="Puan" icon={<IconStarFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <Metric>{row.original.ratingAvg.toFixed(1)}</Metric>,
    },
  ];
}

function SortableHeader({ column, label, icon }: { column: Column<PopularGameTableRow, unknown>; label: string; icon: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      title={`${label} sütununu sırala`}
      aria-label={`${label} sütununu sırala`}
    >
      {icon}
      <ArrowUpDownIcon aria-hidden="true" />
    </Button>
  );
}

function Metric({ children }: { children: React.ReactNode }) {
  return <span className="block text-center text-foreground">{children}</span>;
}

"use client";

import Link from "next/link";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowUpDownIcon, MoreHorizontalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdRow } from "@/lib/db-ads";

export type AdTableRow = AdRow & {
  slotName: string;
  slotKey: string;
};

export function getAdColumns(): ColumnDef<AdTableRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Reklam" />,
      cell: ({ row }) => (
        <div className="min-w-[260px] whitespace-normal">
          <p className="font-bold text-foreground">{row.original.name}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{row.original.ad_code}</p>
        </div>
      ),
    },
    {
      id: "slot",
      accessorFn: (ad) => `${ad.slotName} ${ad.slotKey}`,
      header: ({ column }) => <SortableHeader column={column} label="Slot" />,
      cell: ({ row }) => (
        <div className="min-w-[220px] whitespace-normal">
          <p className="font-semibold text-foreground">{row.original.slotName}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{row.original.slotKey}</p>
        </div>
      ),
    },
    {
      accessorKey: "priority",
      header: ({ column }) => <SortableHeader column={column} label="Öncelik" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.priority ?? 0}</span>,
    },
    {
      id: "device",
      accessorFn: (ad) => getDeviceLabel(ad),
      header: ({ column }) => <SortableHeader column={column} label="Cihaz" />,
      cell: ({ row }) => <span className="whitespace-nowrap text-sm font-semibold">{getDeviceLabel(row.original)}</span>,
    },
    {
      id: "status",
      accessorFn: (ad) => (ad.is_active !== false ? "active" : "inactive"),
      header: ({ column }) => <SortableHeader column={column} label="Durum" />,
      cell: ({ row }) => <StatusBadge active={row.original.is_active !== false} />,
      filterFn: (row, columnId, value) => value === "all" || row.getValue(columnId) === value,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">İşlemler</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`${row.original.name} reklam işlemlerini aç`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Reklam işlemleri</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/admin/ads?slot=${row.original.slot_id}&ad=${row.original.id}#ad-form`}>Düzenle</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function SortableHeader({ column, label }: { column: Column<AdTableRow, unknown>; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDownIcon />
    </Button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "default" : "outline"}>{active ? "Aktif" : "Pasif"}</Badge>;
}

function getDeviceLabel(ad: Pick<AdRow, "show_desktop" | "show_mobile">) {
  const desktop = ad.show_desktop !== false;
  const mobile = ad.show_mobile !== false;

  if (desktop && mobile) return "Masaüstü / Mobil";
  if (desktop) return "Masaüstü";
  if (mobile) return "Mobil";
  return "Gösterilmiyor";
}

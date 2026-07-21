"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ArrowUpDownIcon, MoreHorizontalIcon } from "@/components/icons/app-icons";
import { IconBadgeCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBadgeCheckFillDuo18";
import { IconCalendarClockFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCalendarClockFillDuo18";
import { IconChatBubbleContentFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconChatBubbleContentFillDuo18";
import { IconCodeActionFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCodeActionFillDuo18";
import { IconGamepadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadFillDuo18";
import { IconProfileBasicFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconProfileBasicFillDuo18";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminComment, AdminCommentFilter } from "@/lib/db-comments";

type CommentStatus = "pending" | "approved" | "spam" | "trash";

type ColumnOptions = {
  activeFilter: AdminCommentFilter;
  pendingIds: Set<string>;
  onUpdate: (comment: AdminComment, status: CommentStatus) => Promise<void>;
  onDelete: (comment: AdminComment) => Promise<void>;
};

export function getCommentColumns({ activeFilter, pendingIds, onUpdate, onDelete }: ColumnOptions): ColumnDef<AdminComment>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
          aria-label="Bu sayfadaki yorumları seç"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          aria-label={`${row.original.username} yorumunu seç`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "author",
      accessorFn: (comment) => [comment.displayName, comment.username, comment.email].join(" "),
      header: ({ column }) => <SortableHeader column={column} label="Yazar" icon={<IconProfileBasicFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <CommentAuthor comment={row.original} />,
    },
    {
      accessorKey: "body",
      header: () => (
        <span className="inline-flex items-center justify-center" title="Yorum" aria-label="Yorum">
          <IconChatBubbleContentFillDuo18 className="size-5" />
        </span>
      ),
      cell: ({ row }) => <p className="max-w-3xl whitespace-normal leading-6 text-foreground">{row.original.body}</p>,
      enableSorting: false,
    },
    {
      accessorKey: "gameTitle",
      header: ({ column }) => <SortableHeader column={column} label="Yanıtlanan oyun" icon={<IconGamepadFillDuo18 className="size-5" />} />,
      cell: ({ row }) => {
        const comment = row.original;

        return comment.gameSlug ? (
          <Link href={`/oyun/${comment.gameSlug}`} target="_blank" className="font-bold text-primary hover:underline">
            {comment.gameTitle}
          </Link>
        ) : (
          <span className="font-semibold text-muted-foreground">{comment.gameTitle}</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} label="Durum" icon={<IconBadgeCheckFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      filterFn: (row, columnId, value) => value === "all" || row.getValue(columnId) === value,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column} label="Gönderim" icon={<IconCalendarClockFillDuo18 className="size-5" />} />,
      cell: ({ row }) => (
        <time
          dateTime={row.original.createdAt}
          title={formatFullDate(row.original.createdAt)}
          className="whitespace-nowrap text-sm font-semibold text-muted-foreground"
        >
          {formatRelativeDate(row.original.createdAt)}
        </time>
      ),
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: () => (
        <span className="inline-flex items-center justify-center" title="İşlemler" aria-label="İşlemler">
          <IconCodeActionFillDuo18 className="size-5" />
        </span>
      ),
      cell: ({ row }) => {
        const comment = row.original;
        const pending = pendingIds.has(comment.id);

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={pending} aria-label="Yorum işlemlerini aç">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Yorum işlemleri</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {comment.status !== "approved" ? (
                  <DropdownMenuItem onSelect={() => void onUpdate(comment, "approved")}>Onayla</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => void onUpdate(comment, "pending")}>Onayı kaldır</DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => void onUpdate(comment, "spam")}>Spam olarak işaretle</DropdownMenuItem>
                <DropdownMenuSeparator />
                {activeFilter === "trash" ? (
                  <DropdownMenuItem variant="destructive" onSelect={() => void onDelete(comment)}>Kalıcı sil</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem variant="destructive" onSelect={() => void onUpdate(comment, "trash")}>Çöpe taşı</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function SortableHeader({ column, label, icon }: { column: Column<AdminComment, unknown>; label: string; icon: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      title={label}
      aria-label={label}
    >
      {icon}
      <ArrowUpDownIcon aria-hidden="true" />
    </Button>
  );
}

function CommentAuthor({ comment }: { comment: AdminComment }) {
  return (
    <div className="flex min-w-[210px] items-start gap-3 whitespace-normal">
      <CommentAvatar comment={comment} />
      <div className="min-w-0">
        <div className="font-bold text-foreground">{comment.displayName}</div>
        <div className="mt-0.5 text-xs font-semibold text-muted-foreground">@{comment.username}</div>
        {comment.email ? (
          <a href={`mailto:${comment.email}`} className="mt-1 block break-all text-xs font-semibold text-primary hover:underline">
            {comment.email}
          </a>
        ) : null}
        <div className="mt-1 text-xs font-semibold text-muted-foreground">{comment.userRole === "admin" ? "yönetici" : "kayıtlı kullanıcı"}</div>
      </div>
    </div>
  );
}

function CommentAvatar({ comment }: { comment: AdminComment }) {
  if (comment.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={comment.avatarUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
    );
  }

  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-sm font-bold text-muted-foreground" aria-hidden="true">
      {comment.username.slice(0, 1).toLocaleUpperCase("tr")}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={getStatusBadgeVariant(status)}>{statusLabels[status] ?? status}</Badge>;
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "pending") return "secondary";
  if (status === "spam") return "destructive";
  return "outline";
}

const statusLabels: Record<string, string> = {
  pending: "Bekleyen",
  approved: "Onaylı",
  spam: "Spam",
  trash: "Çöp",
  hidden: "Gizli",
  rejected: "Reddedildi",
};

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) return "az önce";

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("tr-TR", { numeric: "always" });
  const [unit, unitMs] = units.find(([, currentUnitMs]) => absMs >= currentUnitMs) ?? ["minute", 1000 * 60];

  return formatter.format(Math.round(diffMs / unitMs), unit);
}

function formatFullDate(value: string) {
  return new Date(value).toLocaleString("tr-TR");
}

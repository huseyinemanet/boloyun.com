"use client";

import Image from "next/image";
import Link from "next/link";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowUpDownIcon, MoreHorizontalIcon } from "lucide-react";
import { IconBadgeCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBadgeCheckFillDuo18";
import { IconCircleImageFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleImageFillDuo18";
import { IconCode2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCode2FillDuo18";
import { IconCodeActionFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCodeActionFillDuo18";
import { IconExternalLinkFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconExternalLinkFillDuo18";
import { IconGamepadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadFillDuo18";
import { IconMediaPlayFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMediaPlayFillDuo18";
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
import type { ScrapedGameImport } from "@/import/db/game-imports";
import { auditGameSeo } from "@/lib/seo/audit";
import { slugify } from "@/lib/slug/slugify";

type ImportColumnOptions = {
  pendingIds: Set<string>;
  onApprove: (item: ScrapedGameImport) => Promise<void>;
  onStatusChange: (item: ScrapedGameImport, status: "rejected" | "needs_fix") => Promise<void>;
};

export function getImportColumns({ pendingIds, onApprove, onStatusChange }: ImportColumnOptions): ColumnDef<ScrapedGameImport>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
          aria-label="Bu sayfadaki yayınlanabilir oyunları seç"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          aria-label={`${getImportTitle(row.original)} kaydını seç`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "thumbnail",
      header: () => (
        <span className="inline-flex items-center justify-center" title="Görsel" aria-label="Görsel">
          <IconCircleImageFillDuo18 className="size-5" />
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const title = getImportTitle(item);

        return item.thumbnail_url ? (
          <div className="relative aspect-[4/3] w-20 overflow-hidden rounded-md bg-muted">
            <Image src={item.thumbnail_url} alt={title} fill sizes="80px" className="object-cover" />
          </div>
        ) : (
          <div className="grid aspect-[4/3] w-20 place-items-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
            Yok
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "title",
      accessorFn: getImportTitle,
      header: ({ column }) => <SortableHeader column={column} label="Oyun" icon={<IconGamepadFillDuo18 className="size-5" />} />,
      cell: ({ row }) => {
        const item = row.original;
        const title = getImportTitle(item);

        return (
          <div className="min-w-[260px] whitespace-normal">
            <p className="font-bold text-foreground">{title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {item.ai_short_description_tr || item.original_description || item.source_url}
            </p>
          </div>
        );
      },
    },
    {
      id: "source",
      accessorFn: (item) => item.source_domain || sourceDomainFromUrl(item.source_url),
      header: ({ column }) => <SortableHeader column={column} label="Kaynak" icon={<IconExternalLinkFillDuo18 className="size-5" />} />,
      cell: ({ row }) => (
        <Link
          href={row.original.source_url}
          target="_blank"
          title={row.original.source_url}
          className="block max-w-36 truncate text-xs font-semibold text-primary hover:underline"
        >
          {row.getValue("source")}
        </Link>
      ),
    },
    {
      accessorKey: "detected_game_type",
      header: ({ column }) => <SortableHeader column={column} label="Tip" icon={<IconCode2FillDuo18 className="size-5" />} />,
      cell: ({ row }) => <span className="font-medium">{row.original.detected_game_type || "-"}</span>,
    },
    {
      accessorKey: "import_status",
      header: ({ column }) => <SortableHeader column={column} label="Durum" icon={<IconBadgeCheckFillDuo18 className="size-5" />} />,
      cell: ({ row }) => <StatusBadge status={row.original.import_status} />,
      filterFn: (row, columnId, value) => value === "all" || row.getValue(columnId) === value,
    },
    {
      id: "player",
      accessorFn: (item) => item.detected_embed_url ? "Hazır" : "Kontrol gerekli",
      header: ({ column }) => <SortableHeader column={column} label="Player" icon={<IconMediaPlayFillDuo18 className="size-5" />} />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{row.getValue("player")}</span>
      ),
    },
    {
      id: "actions",
      header: () => (
        <span className="inline-flex items-center justify-center" title="İşlemler" aria-label="İşlemler">
          <IconCodeActionFillDuo18 className="size-5" />
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const pending = pendingIds.has(item.id);

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={pending} aria-label={`${getImportTitle(item)} işlemlerini aç`}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Import işlemleri</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!canPublishImport(item)} onSelect={() => void onApprove(item)}>
                  Yayınla
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void onStatusChange(item, "needs_fix")}>
                  Düzeltme gerekli
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void onStatusChange(item, "rejected")}>
                  Reddet
                </DropdownMenuItem>
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

function SortableHeader({ column, label, icon }: { column: Column<ScrapedGameImport, unknown>; label: string; icon: React.ReactNode }) {
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

function StatusBadge({ status }: { status: ScrapedGameImport["import_status"] }) {
  const styles: Partial<Record<ScrapedGameImport["import_status"], string>> = {
    scraped: "bg-primary/15 text-primary",
    ai_generated: "bg-success/15 text-success",
    pending_review: "bg-warning/15 text-warning",
    needs_fix: "bg-warning/15 text-warning",
    failed: "bg-destructive/15 text-destructive",
    rejected: "bg-destructive/15 text-destructive",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold ${styles[status] ?? "bg-muted text-foreground"}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}

const statusLabels: Partial<Record<ScrapedGameImport["import_status"], string>> = {
  discovered: "Keşfedildi",
  scraped: "Tarandı",
  ai_generated: "AI içeriği hazır",
  pending_review: "Onay bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  failed: "Başarısız",
  duplicate: "Tekrar",
  needs_fix: "Düzeltme gerekli",
};

export function canPublishImport(item: ScrapedGameImport) {
  if (!["scraped", "ai_generated", "pending_review"].includes(item.import_status)) return false;
  const title = getImportTitle(item);
  const categories = item.ai_categories_tr || item.original_categories || [];
  const tags = item.ai_tags_tr || item.original_tags || [];
  const longDescription = item.ai_long_description_tr || item.original_description || "";
  if (longDescription.toLocaleLowerCase("tr-TR").includes("ai içerik üretimi bekleniyor")) return false;
  return auditGameSeo({
    title,
    slug: slugify(title),
    seoTitle: item.ai_seo_title_tr || "",
    seoDescription: item.ai_seo_description_tr || "",
    thumbnailUrl: item.thumbnail_url || "",
    shortDescription: item.ai_short_description_tr || item.original_description || "",
    howToPlay: item.ai_how_to_play_tr || item.original_how_to_play || "",
    controls: item.ai_controls_tr || item.original_controls || [],
    primaryCategoryId: categories[0] || "",
    tags,
    gameType: item.detected_game_type || "external",
    embedUrl: item.detected_embed_url,
    swfUrl: item.detected_swf_url,
    html5Url: item.detected_html5_url,
    externalUrl: item.detected_external_url || item.source_url,
  }).publishable;
}

export function getImportTitle(item: ScrapedGameImport) {
  return item.ai_title_tr || item.original_title || titleFromSourceUrl(item.source_url);
}

function titleFromSourceUrl(sourceUrl: string) {
  try {
    const slug = new URL(sourceUrl).pathname.split("/").filter(Boolean).at(-1);
    if (!slug) return sourceUrl;
    return slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return sourceUrl;
  }
}

function sourceDomainFromUrl(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return sourceUrl;
  }
}

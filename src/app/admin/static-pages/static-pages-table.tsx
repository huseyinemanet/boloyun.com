"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { IconBadgeCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBadgeCheckFillDuo18";
import { IconCalendarClockFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCalendarClockFillDuo18";
import { IconCodeActionFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCodeActionFillDuo18";
import { IconTextTitleCaseFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTextTitleCaseFillDuo18";
import { ArrowUpDownIcon, Trash2Icon } from "@/components/icons/app-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteStaticPageAction } from "./actions";

type StatusFilter = "all" | "published" | "draft";
type SortKey = "title" | "updated_at";
export type StaticPageListItem = {
  id: string;
  title: string;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  status: string;
  updated_at?: string | null;
};

export function StaticPagesTable({ pages }: { pages: StaticPageListItem[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated_at");
  const [descending, setDescending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => ({
    all: pages.length,
    published: pages.filter((page) => page.status === "published").length,
    draft: pages.filter((page) => page.status === "draft").length,
  }), [pages]);

  const rows = useMemo(() => {
    return pages
      .filter((page) => status === "all" || page.status === status)
      .sort((left, right) => {
        const leftValue = sort === "title" ? left.title : left.updated_at ?? "";
        const rightValue = sort === "title" ? right.title : right.updated_at ?? "";
        const result = leftValue.localeCompare(rightValue, "tr");
        return descending ? -result : result;
      });
  }, [descending, pages, sort, status]);

  function toggleSort(key: SortKey) {
    if (sort === key) setDescending((value) => !value);
    else {
      setSort(key);
      setDescending(key === "updated_at");
    }
  }

  function removePage(page: StaticPageListItem) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteStaticPageAction(page.id, page.slug);
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Sayfa silinemedi.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)} className="w-full sm:w-auto">
          <TabsList variant="line" aria-label="Sayfa filtresi" className="h-auto flex-wrap justify-start gap-3 p-0">
            <TabsTrigger value="all" className="h-8 flex-none px-0 text-sm font-bold text-primary data-active:text-foreground">Tümü ({counts.all})</TabsTrigger>
            <TabsTrigger value="published" className="h-8 flex-none px-0 text-sm font-bold text-primary data-active:text-foreground">Yayında ({counts.published})</TabsTrigger>
            <TabsTrigger value="draft" className="h-8 flex-none px-0 text-sm font-bold text-primary data-active:text-foreground">Taslak ({counts.draft})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-10 w-44" aria-label="Sayfa durumunu filtrele">
            <SelectValue>{status === "all" ? "Tüm durumlar" : status === "published" ? "Yayında" : "Taslak"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="published">Yayında</SelectItem>
            <SelectItem value="draft">Taslak</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm font-semibold text-muted-foreground">{rows.length.toLocaleString("tr-TR")} sayfa</p>
      </div>

      {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p> : null}

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <Table className="min-w-[560px] table-fixed text-sm">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="h-9 px-3 py-2">
                <SortButton label="Başlık" onClick={() => toggleSort("title")} icon={<IconTextTitleCaseFillDuo18 className="size-5" />} />
              </TableHead>
              <TableHead className="h-9 w-24 px-3 py-2">
                <span className="inline-flex items-center justify-center" title="Durum" aria-label="Durum">
                  <IconBadgeCheckFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead className="h-9 w-32 px-3 py-2">
                <SortButton label="Son güncelleme" onClick={() => toggleSort("updated_at")} icon={<IconCalendarClockFillDuo18 className="size-5" />} />
              </TableHead>
              <TableHead className="h-9 w-32 px-3 py-2 text-right">
                <span className="inline-flex items-center justify-center" title="İşlem" aria-label="İşlem">
                  <IconCodeActionFillDuo18 className="size-5" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((page) => (
              <TableRow key={page.id} className="align-middle">
                <TableCell className="px-3 py-2">
                  <Link href={`/admin/static-pages/${page.id}/edit`} className="block truncate font-bold text-primary hover:underline">{page.title}</Link>
                </TableCell>
                <TableCell className="px-3 py-2"><Badge variant={page.status === "published" ? "default" : "outline"} className="px-2 py-0.5 text-[11px] leading-4">{page.status === "published" ? "Yayında" : "Taslak"}</Badge></TableCell>
                <TableCell className="whitespace-nowrap px-3 py-2 text-muted-foreground"><time dateTime={page.updated_at ?? undefined} title={formatFullDate(page.updated_at)}>{formatRelativeDate(page.updated_at)}</time></TableCell>
                <TableCell className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-semibold">
                    <Link href={`/sayfa/${page.slug}`} target="_blank" className="text-primary hover:underline">Görüntüle</Link>
                    <span className="text-muted-foreground">|</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button type="button" disabled={isPending} className="text-destructive hover:underline disabled:opacity-50">Sil</button>
                      </AlertDialogTrigger>
                      <AlertDialogContent size="sm">
                        <AlertDialogHeader>
                          <AlertDialogMedia className="bg-destructive/15 text-destructive">
                            <Trash2Icon aria-hidden="true" />
                          </AlertDialogMedia>
                          <AlertDialogTitle>Sayfayı sil?</AlertDialogTitle>
                          <AlertDialogDescription>
                            “{page.title}” kalıcı olarak silinecek ve bu işlem geri alınamayacak.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => removePage(page)}>Sayfayı Sil</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center font-medium text-muted-foreground">{pages.length ? "Bu durumda sayfa bulunamadı." : "Henüz statik sayfa yok. Yeni bir sayfa ekleyebilirsiniz."}</TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function SortButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold hover:text-foreground" title={label} aria-label={label}>
      {icon}
      <ArrowUpDownIcon className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const difference = date.getTime() - Date.now();
  const absoluteDifference = Math.abs(difference);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];
  if (absoluteDifference < 60_000) return "az önce";
  const [unit, milliseconds] = units.find(([, unitMilliseconds]) => absoluteDifference >= unitMilliseconds) ?? ["minute", 60_000];
  return new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" }).format(Math.round(difference / milliseconds), unit);
}

function formatFullDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

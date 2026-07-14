"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { IconBadgeCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBadgeCheckFillDuo18";
import { IconCalendarClockFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCalendarClockFillDuo18";
import { IconChatBubbleContentFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconChatBubbleContentFillDuo18";
import { IconEnvelopeFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconEnvelopeFillDuo18";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { IconProfileBasicFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconProfileBasicFillDuo18";
import { IconShieldCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconShieldCheckFillDuo18";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bulkUpdateUsersAction } from "./actions";
import type { AdminUser, AdminUserCounts, AdminUserFilter } from "@/lib/db-users";

const filters: Array<{ key: AdminUserFilter; label: string }> = [
  { key: "all", label: "Tümü" },
  { key: "admin", label: "Yöneticiler" },
  { key: "member", label: "Üyeler" },
  { key: "blocked", label: "Engellenenler" },
];

const bulkActions = [
  { value: "block", label: "Engelle" },
  { value: "unblock", label: "Engeli Kaldır" },
  { value: "make_admin", label: "Yönetici yap" },
  { value: "make_member", label: "Üye yap" },
  { value: "delete", label: "Sil" },
] as const;

type BulkAction = (typeof bulkActions)[number]["value"];

export function UsersTable({ users, counts, activeFilter }: { users: AdminUser[]; counts: AdminUserCounts; activeFilter: AdminUserFilter }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>("block");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, setIsPending] = useState(false);

  const rows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("tr");
    return users.filter((user) => {
      if (hiddenIds.has(user.id)) return false;
      if (!query) return true;
      return [user.username, user.email, user.firstName, user.lastName, user.displayName, user.role, user.status]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(query);
    });
  }, [hiddenIds, searchQuery, users]);

  const allVisibleSelected = rows.length > 0 && rows.every((user) => selectedIds.has(user.id));

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(rows.map((user) => user.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function applyBulkAction() {
    const ids = rows.map((user) => user.id).filter((id) => selectedIds.has(id));
    if (!ids.length || isPending) return;

    setIsPending(true);
    if (["block", "delete", "make_member"].includes(bulkAction)) {
      setHiddenIds((current) => new Set([...current, ...ids]));
    }

    try {
      await bulkUpdateUsersAction(ids, bulkAction);
      setSelectedIds(new Set());
      toast.success(getBulkSuccessMessage(bulkAction, ids.length));
      router.refresh();
    } catch (error) {
      setHiddenIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.error(error instanceof Error ? error.message : "Toplu işlem uygulanamadı.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Tabs value={activeFilter} className="w-full sm:w-auto">
          <TabsList variant="line" aria-label="Kullanıcı filtresi" className="h-auto flex-wrap justify-start gap-3 p-0">
            {filters.map((filter) => (
              <TabsTrigger key={filter.key} value={filter.key} asChild className="h-8 flex-none px-0 text-sm font-bold text-primary data-active:text-foreground">
                <Link href={filter.key === "all" ? "/admin/users" : `/admin/users?role=${filter.key}`}>
                  {filter.label} <span className="text-muted-foreground">({counts[filter.key]})</span>
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex w-full max-w-md items-center gap-2 sm:w-auto">
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Kullanıcı ara"
            className="h-10 min-w-0 flex-1 font-normal"
          />
          <Button type="button" variant="outline" className="h-10 px-3 text-sm font-bold">Ara</Button>
        </div>
      </div>

      <Toolbar bulkAction={bulkAction} itemCount={rows.length} isPending={isPending} onBulkActionChange={setBulkAction} onApply={applyBulkAction} />

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <Table className="min-w-[950px]">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => toggleAll(checked === true)} aria-label="Tüm kullanıcıları seç" />
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="Kullanıcı" aria-label="Kullanıcı">
                  <IconProfileBasicFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="E-posta" aria-label="E-posta">
                  <IconEnvelopeFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="Rol" aria-label="Rol">
                  <IconShieldCheckFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="Durum" aria-label="Durum">
                  <IconBadgeCheckFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="Yorum" aria-label="Yorum">
                  <IconChatBubbleContentFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="Favori" aria-label="Favori">
                  <IconHeartFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="Kayıt" aria-label="Kayıt">
                  <IconCalendarClockFillDuo18 className="size-5" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((user) => (
              <TableRow key={user.id} className="align-top hover:bg-muted/50">
                <TableCell>
                  <Checkbox checked={selectedIds.has(user.id)} onCheckedChange={(checked) => toggleOne(user.id, checked === true)} aria-label={`${user.username} kullanıcısını seç`} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <Link
                    href={`/admin/users/${user.id}/edit`}
                    className="group inline-flex items-center gap-3"
                    aria-label={`${getUserDisplayName(user)} kullanıcısını aç`}
                  >
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground group-hover:underline">{getUserDisplayName(user)}</p>
                      <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {user.email ? (
                    <a
                      href={`mailto:${user.email}`}
                      className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
                      aria-label={`${user.email} adresine e-posta gönder`}
                    >
                      {user.email}
                    </a>
                  ) : "-"}
                </TableCell>
                <TableCell>{user.role === "admin" ? "Yönetici" : "Üye"}</TableCell>
                <TableCell>{user.status === "blocked" ? "Engelli" : "Aktif"}</TableCell>
                <TableCell>{user.commentCount.toLocaleString("tr-TR")}</TableCell>
                <TableCell>{user.favoriteCount.toLocaleString("tr-TR")}</TableCell>
                <TableCell className="whitespace-normal">
                  <time dateTime={user.createdAt} title={formatFullDate(user.createdAt)}>
                    {formatRelativeDate(user.createdAt)}
                  </time>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="h-28 font-medium text-muted-foreground">Kullanıcı bulunamadı.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <Toolbar bulkAction={bulkAction} itemCount={rows.length} isPending={isPending} onBulkActionChange={setBulkAction} onApply={applyBulkAction} />
    </div>
  );
}

function getBulkSuccessMessage(action: BulkAction, count: number) {
  const suffix = count > 1 ? `${count.toLocaleString("tr-TR")} kullanıcı` : "Kullanıcı";

  if (action === "block") return `${suffix} engellendi.`;
  if (action === "unblock") return `${suffix} aktifleştirildi.`;
  if (action === "make_admin") return `${suffix} yönetici yapıldı.`;
  if (action === "make_member") return `${suffix} üye yapıldı.`;
  return `${suffix} silindi.`;
}

function Toolbar({ bulkAction, itemCount, isPending, onBulkActionChange, onApply }: { bulkAction: BulkAction; itemCount: number; isPending: boolean; onBulkActionChange: (value: BulkAction) => void; onApply: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={bulkAction} onValueChange={(value) => onBulkActionChange(value as BulkAction)}>
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bulkActions.map((action) => <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" onClick={onApply} disabled={isPending} variant="outline" className="h-10 px-3 text-sm font-bold disabled:opacity-50">
          Uygula
        </Button>
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{itemCount.toLocaleString("tr-TR")} kullanıcı</p>
    </div>
  );
}

function UserAvatar({ user }: { user: AdminUser }) {
  const displayName = getUserDisplayName(user);

  return (
    <Avatar size="lg">
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={displayName} /> : null}
      <AvatarFallback className="font-bold">{user.username.slice(0, 2).toLocaleUpperCase("tr")}</AvatarFallback>
    </Avatar>
  );
}

function getUserDisplayName(user: AdminUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.displayName || user.username;
}

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

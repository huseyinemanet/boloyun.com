"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const SETTINGS_NAVIGATION_GROUPS = [
  {
    label: "Site ve deneyim",
    items: [
      ["general", "Genel"],
      ["appearance", "Görünüm ve Ana Sayfa"],
      ["games", "Oyun Deneyimi"],
      ["media", "Dosya Yönetimi"],
      ["audio", "Ses"],
    ],
  },
  {
    label: "Büyüme ve yayın",
    items: [
      ["seo", "SEO"],
      ["permalinks", "Bağlantılar"],
      ["ads", "Reklamlar"],
      ["integrations", "Entegrasyonlar"],
    ],
  },
  {
    label: "Üyeler ve erişim",
    items: [
      ["community", "Üyelik ve Yorumlar"],
      ["security", "Güvenlik"],
    ],
  },
  {
    label: "Operasyon",
    items: [
      ["ai", "Yapay Zekâ"],
      ["system", "Sistem"],
    ],
  },
] as const;

export function SettingsNavigation() {
  const pathname = usePathname();
  const { playClickSound } = useClickSound();
  const activeKey = getActiveKey(pathname);

  function navigateFromMobile(key: string) {
    if (key === activeKey) return;
    playClickSound();
    window.setTimeout(() => window.location.assign(`/admin/settings/${key}`), 60);
  }

  function playNavigationSound(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      pathname === href
    ) {
      return;
    }
    playClickSound();
  }

  return (
    <>
      <div className="xl:hidden">
        <Select value={activeKey} onValueChange={navigateFromMobile}>
          <SelectTrigger className="w-full" aria-label="Ayar bölümü seç">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {SETTINGS_NAVIGATION_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label="Ayar bölümleri" className="sticky top-20 hidden space-y-5 rounded-xl bg-card p-3 ring-1 ring-foreground/10 xl:block">
        {SETTINGS_NAVIGATION_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
            <div className="grid gap-0.5">
              {group.items.map(([key, label]) => {
                const href = `/admin/settings/${key}`;
                const active = pathname === href;
                return (
                  <Link
                    key={key}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={(event) => playNavigationSound(event, href)}
                    className={cn(
                      "block rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active && "bg-accent font-semibold text-foreground",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}

function getActiveKey(pathname: string) {
  for (const group of SETTINGS_NAVIGATION_GROUPS) {
    for (const [key] of group.items) {
      if (pathname === `/admin/settings/${key}`) return key;
    }
  }
  return "general";
}

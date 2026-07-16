"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";
import { IconBrainSparkleFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconBrainSparkleFillDuo18";
import { IconChartAreaFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconChartAreaFillDuo18";
import { IconChatBubbleWritingFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconChatBubbleWritingFillDuo18";
import { IconFileTreeFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconFileTreeFillDuo18";
import { IconGamepadButtonsFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadButtonsFillDuo18";
import { IconGridListFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGridListFillDuo18";
import { IconPromotionFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPromotionFillDuo18";
import { IconRadarFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconRadarFillDuo18";
import { IconSettingsWrenchFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconSettingsWrenchFillDuo18";
import { IconTagsFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTagsFillDuo18";
import { IconUserGroupFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconUserGroupFillDuo18";
import { useEffect, useState, type MouseEvent } from "react";
import { useClickSound } from "@/components/audio/click-sound-provider";
import { cn } from "@/lib/utils";

const adminGroups = [
  {
    label: "Genel",
    links: [
      { href: "/admin", label: "Genel Bakış", icon: IconChartAreaFillDuo18 },
    ],
  },
  {
    label: "İçerik",
    links: [
      { href: "/admin/games", label: "Oyunlar", icon: IconGamepadButtonsFillDuo18 },
      { href: "/admin/crawler", label: "Yeni Oyun Tara", icon: IconRadarFillDuo18 },
      { href: "/admin/categories", label: "Kategoriler", icon: IconGridListFillDuo18 },
      { href: "/admin/tags", label: "Etiketler", icon: IconTagsFillDuo18 },
      { href: "/admin/static-pages", label: "Sayfalar", icon: IconFileTreeFillDuo18 },
    ],
  },
  {
    label: "Topluluk",
    links: [
      { href: "/admin/comments", label: "Yorumlar", icon: IconChatBubbleWritingFillDuo18 },
      { href: "/admin/users", label: "Kullanıcılar", icon: IconUserGroupFillDuo18 },
    ],
  },
  {
    label: "Operasyon",
    links: [
      { href: "/admin/ads", label: "Reklamlar", icon: IconPromotionFillDuo18 },
      { href: "/admin/ai", label: "AI Merkezi", icon: IconBrainSparkleFillDuo18 },
      { href: "/admin/settings", label: "Ayarlar", icon: IconSettingsWrenchFillDuo18 },
    ],
  },
] as const;

const PENDING_SPINNER_TIMEOUT_MS = 8000;

export function AdminSidebar() {
  const pathname = usePathname();
  const { playClickSound } = useClickSound();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const visiblePendingHref = pendingHref && !isAdminLinkActive(pathname, pendingHref) ? pendingHref : null;

  useEffect(() => {
    if (!visiblePendingHref) return;

    const timeout = window.setTimeout(() => {
      setPendingHref((currentHref) => (currentHref === visiblePendingHref ? null : currentHref));
    }, PENDING_SPINNER_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [visiblePendingHref]);

  function markPending(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      isAdminLinkActive(pathname, href)
    ) {
      return;
    }

    playClickSound();
    setPendingHref(href);
  }

  return (
    <aside className="overflow-x-auto lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-visible">
      <nav className="flex min-w-max gap-3 lg:grid lg:min-w-0 lg:gap-3" aria-label="Admin menüsü">
        {adminGroups.map((group) => (
          <div key={group.label} className="flex gap-1 lg:grid lg:gap-0.5">
            <p className="hidden px-2 pb-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 lg:block">
              {group.label}
            </p>
            {group.links.map(({ href, label, icon: Icon }) => {
              const active = isAdminLinkActive(pathname, href);
              const pending = visiblePendingHref === href;

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-busy={pending || undefined}
                  onClick={(event) => markPending(event, href)}
                  className={cn(
                    "group flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-md transition-colors",
                      active ? "bg-primary-foreground/10" : "bg-muted text-foreground group-hover:bg-background",
                    )}
                    aria-hidden="true"
                  >
                    {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : <Icon className="size-4" />}
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function isAdminLinkActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

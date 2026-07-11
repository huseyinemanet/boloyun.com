"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";
import { IconGamepadFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGamepadFillDuo18";
import { IconGridCircleListFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGridCircleListFillDuo18";
import { IconHouseDashboard2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHouseDashboard2FillDuo18";
import { IconListCheckbox2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconListCheckbox2FillDuo18";
import { IconMagnifierSparkle2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMagnifierSparkle2FillDuo18";
import { IconMegaphoneFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMegaphoneFillDuo18";
import { IconMsgs2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMsgs2FillDuo18";
import { IconFilesContentFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconFilesContentFillDuo18";
import { IconSlidersVerticalFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconSlidersVerticalFillDuo18";
import { IconTag2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTag2FillDuo18";
import { IconUsersFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconUsersFillDuo18";
import { useEffect, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Genel Bakış", icon: IconHouseDashboard2FillDuo18 },
  { href: "/admin/crawler", label: "Yeni Oyun Tara", icon: IconMagnifierSparkle2FillDuo18 },
  { href: "/admin/imports", label: "Onay Kuyruğu", icon: IconListCheckbox2FillDuo18 },
  { href: "/admin/games", label: "Oyunlar", icon: IconGamepadFillDuo18 },
  { href: "/admin/categories", label: "Kategoriler", icon: IconGridCircleListFillDuo18 },
  { href: "/admin/tags", label: "Etiketler", icon: IconTag2FillDuo18 },
  { href: "/admin/static-pages", label: "Sayfalar", icon: IconFilesContentFillDuo18 },
  { href: "/admin/ads", label: "Reklamlar", icon: IconMegaphoneFillDuo18 },
  { href: "/admin/comments", label: "Yorumlar", icon: IconMsgs2FillDuo18 },
  { href: "/admin/users", label: "Kullanıcılar", icon: IconUsersFillDuo18 },
  { href: "/admin/settings", label: "Ayarlar", icon: IconSlidersVerticalFillDuo18 },
] as const;

const PENDING_SPINNER_TIMEOUT_MS = 8000;

export function AdminSidebar() {
  const pathname = usePathname();
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

    setPendingHref(href);
  }

  return (
    <aside className="overflow-x-auto lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-visible">
      <nav className="flex min-w-max gap-1 lg:grid lg:min-w-0 lg:gap-0.5" aria-label="Admin menüsü">
        {adminLinks.map(({ href, label, icon: Icon }) => {
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
      </nav>
    </aside>
  );
}

function isAdminLinkActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

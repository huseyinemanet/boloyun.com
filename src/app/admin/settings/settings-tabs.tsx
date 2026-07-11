"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  ["general", "Genel"],
  ["appearance", "Görünüm ve Ana Sayfa"],
  ["games", "Oyunlar"],
  ["seo", "SEO"],
  ["ads", "Reklamlar"],
  ["community", "Üyelik ve Yorumlar"],
  ["integrations", "Entegrasyonlar"],
  ["security", "Güvenlik"],
  ["system", "Sistem"],
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ayar bölümleri" className="overflow-x-auto rounded-md border border-border bg-card p-1">
      <div className="flex min-w-max gap-1">
        {tabs.map(([key, label]) => {
          const href = `/admin/settings/${key}`;
          const active = pathname === href;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-xs font-bold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { SoundLink } from "@/components/audio/sound-link";
import { cn } from "@/lib/utils";

const tabs = [
  ["general", "Genel"],
  ["ai", "AI"],
  ["media", "Media"],
  ["permalinks", "Permalinks"],
  ["appearance", "Görünüm ve Ana Sayfa"],
  ["games", "Oyunlar"],
  ["seo", "SEO"],
  ["ads", "Reklamlar"],
  ["community", "Üyelik ve Yorumlar"],
  ["integrations", "Entegrasyonlar"],
  ["security", "Güvenlik"],
  ["audio", "Ses"],
  ["system", "Sistem"],
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ayar bölümleri" className="rounded-md border border-border bg-card p-2">
      <div className="flex flex-wrap gap-1">
        {tabs.map(([key, label]) => {
          const href = `/admin/settings/${key}`;
          const active = pathname === href;
          return (
            <SoundLink
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-xs font-bold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </SoundLink>
          );
        })}
      </div>
    </nav>
  );
}

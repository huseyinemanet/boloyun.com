"use client";

import { usePathname } from "next/navigation";
import { SoundLink } from "@/components/audio/sound-link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const activeTab = tabs.find(([key]) => pathname === `/admin/settings/${key}`)?.[0] ?? "general";

  return (
    <Tabs value={activeTab} className="gap-0">
      <TabsList variant="line" aria-label="Ayar bölümleri" className="h-auto w-full flex-wrap justify-start gap-x-5 gap-y-3 overflow-visible border-b border-border p-0 pb-2">
        {tabs.map(([key, label]) => {
          const href = `/admin/settings/${key}`;
          const active = pathname === href;
          return (
            <TabsTrigger key={key} value={key} asChild className="h-8 flex-none px-0 text-sm font-bold text-muted-foreground data-active:text-foreground">
              <SoundLink href={href} aria-current={active ? "page" : undefined}>
                {label}
              </SoundLink>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

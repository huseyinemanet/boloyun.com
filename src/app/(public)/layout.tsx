import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { getPublicSettings } from "@/lib/db-settings";
import { SoundLink } from "@/components/audio/sound-link";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { general, appearance } = await getPublicSettings();
  if (general.maintenanceMode) {
    return <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-4 py-16 text-center"><section className="rounded-lg border border-border bg-card p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{general.siteName}</p><h1 className="mt-3 text-3xl font-semibold">Kısa bir bakım molasındayız</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Oyun deneyimini iyileştirmek için çalışıyoruz. Lütfen biraz sonra yeniden kontrol et.</p></section></main>;
  }
  return (
    <>
      {appearance.announcementEnabled && appearance.announcementText ? <div className="border-b border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm font-bold">{appearance.announcementUrl ? <SoundLink href={appearance.announcementUrl} className="hover:underline">{appearance.announcementText}</SoundLink> : appearance.announcementText}</div> : null}
      <div className="mx-auto grid w-full grid-cols-1 gap-4 px-3 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:px-4">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="min-w-0 scroll-mt-4">{children}</main>
      </div>
    </>
  );
}

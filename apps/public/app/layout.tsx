import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@public/lib/data";
import { SiteHeader } from "@public/components/site-header";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(settings.seo.canonicalDomain || process.env.SITE_URL || "https://boloyun.com"),
    title: {
      default: settings.seo.defaultTitle,
      template: `%s | ${settings.general.siteName}`,
    },
    description: settings.seo.defaultDescription,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="tr">
      <body>
        <SiteHeader siteName={settings.general.siteName} />
        <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:px-4">
          <aside className="hidden md:block">
            <nav className="sticky top-20 space-y-1 rounded-md border border-border bg-card p-2">
              <Link href="/" className="block rounded-sm px-3 py-2 text-sm font-black hover:bg-accent">Ana Sayfa</Link>
              <Link href="/arama" className="block rounded-sm px-3 py-2 text-sm font-black hover:bg-accent">Oyun Ara</Link>
              <Link href="/#yeni-oyunlar" className="block rounded-sm px-3 py-2 text-sm font-black hover:bg-accent">Yeni Oyunlar</Link>
              <Link href="/#populer-oyunlar" className="block rounded-sm px-3 py-2 text-sm font-black hover:bg-accent">Popüler Oyunlar</Link>
              <Link href="/#trend-oyunlar" className="block rounded-sm px-3 py-2 text-sm font-black hover:bg-accent">Trend Oyunlar</Link>
            </nav>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
        <footer className="border-t border-border py-6">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-3 text-sm font-semibold text-muted-foreground md:px-4">
            <Link href="/sayfa/kullanim-sartlari">Kullanım Şartları</Link>
            <Link href="/sayfa/gizlilik-politikasi">Gizlilik Politikası</Link>
            <Link href="/sayfa/cerez-politikasi">Çerez Politikası</Link>
            <Link href="/sayfa/iletisim">İletişim</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

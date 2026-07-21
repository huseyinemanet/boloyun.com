import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { Header } from "@/components/layout/header";
import { getPublicSettings } from "@/lib/db-settings";
import { ConsentScripts } from "@/components/integrations/consent-scripts";
import { ClickSoundProvider } from "@/components/audio/click-sound-provider";
import { NavigationRuntime } from "@/components/navigation/navigation-runtime";
import { ViewerStateProvider } from "@/components/auth/viewer-state-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const notoSans = Noto_Sans({
  weight: "variable",
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-noto-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const { general, seo } = await getPublicSettings();
  const customFavicon = general.faviconUrl && general.faviconUrl !== "/favicon.ico" ? general.faviconUrl : undefined;
  return {
    metadataBase: new URL(seo.canonicalDomain),
    title: { default: seo.defaultTitle, template: seo.defaultTitleTemplate.replace("{{sayfa}}", "%s").replace("{{site_adı}}", general.siteName) },
    description: seo.defaultDescription,
    applicationName: general.siteName,
    alternates: { canonical: "/" },
    icons: customFavicon ? { icon: customFavicon } : undefined,
    robots: { index: true, follow: true },
    verification: { google: seo.googleVerification || undefined, other: seo.bingVerification ? { "msvalidate.01": seo.bingVerification } : undefined },
    openGraph: { title: seo.defaultTitle, description: seo.defaultDescription, siteName: general.siteName, type: "website", locale: "tr_TR", url: "/", images: [{ url: seo.openGraphImageUrl, width: 1200, height: 630, alt: general.siteName }] },
    twitter: { card: "summary_large_image", title: seo.defaultTitle, description: seo.defaultDescription, images: [{ url: seo.openGraphImageUrl, alt: general.siteName }] },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { audio, integrations } = await getPublicSettings();

  return (
    <html lang="tr" className={`${notoSans.variable} dark scroll-smooth font-sans`} style={{ colorScheme: "dark" }}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClickSoundProvider settings={audio}>
          <TooltipProvider>
            <ViewerStateProvider>
              <ConsentScripts settings={integrations} />
              <NavigationRuntime />
              <a href="#main-content" className="skip-link">Ana içeriğe geç</a>
              <Header />
              {children}
            </ViewerStateProvider>
          </TooltipProvider>
        </ClickSoundProvider>
      </body>
    </html>
  );
}

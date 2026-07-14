import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import { getPublicSettings } from "@/lib/db-settings";
import { ConsentScripts } from "@/components/integrations/consent-scripts";
import { ClickSoundProvider } from "@/components/audio/click-sound-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const { general, seo } = await getPublicSettings();
  return {
    metadataBase: new URL(seo.canonicalDomain),
    title: { default: seo.defaultTitle, template: seo.defaultTitleTemplate.replace("{{sayfa}}", "%s").replace("{{site_adı}}", general.siteName) },
    description: seo.defaultDescription,
    applicationName: general.siteName,
    alternates: { canonical: "/" },
    icons: { icon: general.faviconUrl },
    robots: { index: true, follow: true },
    verification: { google: seo.googleVerification || undefined, other: seo.bingVerification ? { "msvalidate.01": seo.bingVerification } : undefined },
    openGraph: { title: seo.defaultTitle, description: seo.defaultDescription, siteName: general.siteName, type: "website", locale: "tr_TR", url: "/", images: [{ url: seo.openGraphImageUrl, width: 1200, height: 630, alt: general.siteName }] },
    twitter: { card: "summary_large_image", title: seo.defaultTitle, description: seo.defaultDescription, images: [seo.openGraphImageUrl] },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { audio, integrations } = await getPublicSettings();

  return (
    <html lang="tr" className={`dark font-sans ${inter.variable}`} style={{ colorScheme: "dark" }}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClickSoundProvider settings={audio}>
          <a href="#main-content" className="skip-link">Ana içeriğe geç</a>
          <Header />
          {children}
          <ConsentScripts settings={integrations} />
          <Toaster position="top-center" />
        </ClickSoundProvider>
      </body>
    </html>
  );
}

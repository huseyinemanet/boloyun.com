import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { getPublicSettings } from "@/lib/db-settings";
import { ConsentScripts } from "@/components/integrations/consent-scripts";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark font-sans" style={{ colorScheme: "dark" }}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/npm/geist@1.7.2/dist/fonts/geist-sans/Geist-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a href="#main-content" className="skip-link">Ana içeriğe geç</a>
        <Header />
        {children}
        <ConsentScripts />
      </body>
    </html>
  );
}

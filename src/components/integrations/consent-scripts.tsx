"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

type Consent = "accepted" | "rejected" | null;
type IntegrationSettings = { googleAnalyticsId: string; googleTagManagerId: string; clarityProjectId: string; metaPixelId: string; consentModeEnabled: boolean };

export function ConsentScripts() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [consent, setConsent] = useState<Consent>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const stored = window.localStorage.getItem("boloyun_cookie_consent");
    const timer = window.setTimeout(() => setConsent(stored === "accepted" || stored === "rejected" ? stored : null), 0);
    fetch("/api/public/integrations").then((response) => response.ok ? response.json() as Promise<IntegrationSettings> : null).then((value) => value && setSettings(value)).catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (pathname.startsWith("/admin")) return null;

  function decide(value: Exclude<Consent, null>) {
    window.localStorage.setItem("boloyun_cookie_consent", value);
    setConsent(value);
  }

  const canLoad = settings && (consent === "accepted" || !settings.consentModeEnabled);
  return <>
    {canLoad && settings.googleAnalyticsId ? <><Script src={`https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`} strategy="afterInteractive" /><Script id="boloyun-ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${settings.googleAnalyticsId}');`}</Script></> : null}
    {canLoad && settings.googleTagManagerId ? <Script id="boloyun-gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${settings.googleTagManagerId}');`}</Script> : null}
    {canLoad && settings.clarityProjectId ? <Script id="boloyun-clarity" strategy="afterInteractive">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script','${settings.clarityProjectId}');`}</Script> : null}
    {canLoad && settings.metaPixelId ? <Script id="boloyun-meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.metaPixelId}');fbq('track','PageView');`}</Script> : null}
    {settings?.consentModeEnabled && consent === null ? <aside aria-label="Çerez tercihleri" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border border-border bg-card p-4 shadow-2xl"><p className="text-sm font-black">Çerez tercihleri</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Siteyi geliştirmek için isteğe bağlı analitik çerezleri kullanabiliriz. Oyunlar temel çerezlerle çalışmaya devam eder.</p><div className="mt-3 flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={() => decide("rejected")}>Yalnızca Gerekli</Button><Button size="sm" onClick={() => decide("accepted")}>Kabul Et</Button></div></aside> : null}
  </>;
}

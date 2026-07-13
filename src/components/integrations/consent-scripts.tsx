"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

type Consent = "accepted" | "rejected" | null;
type IntegrationSettings = { googleAnalyticsId: string; googleTagManagerId: string; clarityProjectId: string; metaPixelId: string; consentModeEnabled: boolean };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function ConsentScripts({ settings }: { settings: IntegrationSettings }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const stored = window.localStorage.getItem("boloyun_cookie_consent");
    const savedConsent = stored === "accepted" || stored === "rejected" ? stored : null;
    const timer = window.setTimeout(() => {
      setConsent(savedConsent);
      updateGoogleConsent(savedConsent === "accepted");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, settings.consentModeEnabled]);

  if (pathname.startsWith("/admin")) return null;

  function decide(value: Exclude<Consent, null>) {
    window.localStorage.setItem("boloyun_cookie_consent", value);
    setConsent(value);
    updateGoogleConsent(value === "accepted");
  }

  const canLoadOptionalScripts = consent === "accepted" || !settings.consentModeEnabled;
  const googleConsentDefault = settings.consentModeEnabled ? "denied" : "granted";
  return <>
    {settings.googleAnalyticsId ? <><Script src={`https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`} strategy="afterInteractive" /><Script id="boloyun-ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('consent','default',{'analytics_storage':'${googleConsentDefault}','ad_storage':'${googleConsentDefault}','ad_user_data':'${googleConsentDefault}','ad_personalization':'${googleConsentDefault}','wait_for_update':500});gtag('js',new Date());gtag('config','${settings.googleAnalyticsId}');`}</Script></> : null}
    {canLoadOptionalScripts && settings.googleTagManagerId ? <Script id="boloyun-gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${settings.googleTagManagerId}');`}</Script> : null}
    {canLoadOptionalScripts && settings.clarityProjectId ? <Script id="boloyun-clarity" strategy="afterInteractive">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script','${settings.clarityProjectId}');`}</Script> : null}
    {canLoadOptionalScripts && settings.metaPixelId ? <Script id="boloyun-meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.metaPixelId}');fbq('track','PageView');`}</Script> : null}
    {settings.consentModeEnabled && consent === null ? <aside aria-label="Çerez tercihleri" className="fixed right-3 bottom-3 z-50 w-[min(calc(100vw-1.5rem),22rem)] rounded-md border border-border bg-card p-3 shadow-2xl"><p className="text-xs font-semibold">Çerez tercihleri</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">İsteğe bağlı analitik çerezleri kullanabiliriz. Oyunlar temel çerezlerle çalışır.</p><div className="mt-2 flex justify-end gap-1.5"><Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => decide("rejected")}>Gerekli</Button><Button size="sm" className="h-7 px-2 text-xs" onClick={() => decide("accepted")}>Kabul Et</Button></div></aside> : null}
  </>;
}

function updateGoogleConsent(accepted: boolean) {
  window.gtag?.("consent", "update", {
    analytics_storage: accepted ? "granted" : "denied",
    ad_storage: accepted ? "granted" : "denied",
    ad_user_data: accepted ? "granted" : "denied",
    ad_personalization: accepted ? "granted" : "denied",
  });
}

"use client";

import Script from "next/script";
import { useState } from "react";

export function BotProtectionFields({ challenge = false, action }: { challenge?: boolean; action: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [startedAt] = useState(() => Date.now());
  return <>
    <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] size-px opacity-0" />
    <input type="hidden" name="form_started_at" value={startedAt} />
    {challenge ? (
      siteKey ? <>
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
        <div className="cf-turnstile" data-sitekey={siteKey} data-action={action} data-theme="dark" data-size="flexible" />
      </> : <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">Bot doğrulaması yapılandırılmamış.</p>
    ) : null}
  </>;
}

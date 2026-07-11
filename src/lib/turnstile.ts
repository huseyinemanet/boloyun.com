import "server-only";

import { getClientIp } from "@/lib/abuse";

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

export async function verifyRiskChallenge(formData: FormData, expectedAction: string) {
  const token = String(formData.get("cf-turnstile-response") ?? "").trim();
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!token || !secret) return false;

  const body = new URLSearchParams({ secret, response: token, remoteip: await getClientIp() });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;
  const result = await response.json() as TurnstileResponse;
  const expectedHost = new URL(process.env.SITE_URL || "https://boloyun.com").hostname;
  return result.success === true && (!result.hostname || result.hostname === expectedHost) && (!result.action || result.action === expectedAction);
}

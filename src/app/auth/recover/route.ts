import { NextResponse, type NextRequest } from "next/server";
import { assertHumanForm, consumeRateLimits, getClientIp } from "@/lib/abuse";
import { getRequestOrigin, publicUrlFromRequest } from "@/lib/request-origin";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { verifyRiskChallenge } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  if (!hasTrustedMutationOrigin(request)) return redirectTo(request, "/sifremi-unuttum?error=form");

  let formData: FormData;
  try {
    formData = await request.formData();
    assertHumanForm(formData);
  } catch {
    return redirectTo(request, "/sifremi-unuttum?error=form");
  }

  const email = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr-TR");
  const rate = await consumeRateLimits([
    { action: "auth_recovery_ip", subject: await getClientIp(), limit: 10, windowSeconds: 3600 },
    { action: "auth_recovery_email", subject: email, limit: 3, windowSeconds: 3600 },
  ]);
  if (!rate.allowed && !await verifyRiskChallenge(formData, "recovery")) {
    return redirectTo(request, "/sifremi-unuttum?error=challenge&challenge=1");
  }

  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return redirectTo(request, "/sifremi-unuttum?error=config");
  const { error } = await routeClient.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getRequestOrigin()}/auth/callback?next=/sifre-yenile`,
  });

  if (error) {
    console.error("Password recovery email failed", { code: error.code, status: error.status });
    return routeClient.applyTo(redirectTo(request, "/sifremi-unuttum?error=reset"));
  }
  return routeClient.applyTo(redirectTo(request, "/sifremi-unuttum?notice=sent"));
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(publicUrlFromRequest(request, path), 303);
}

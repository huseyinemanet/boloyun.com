import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { publicUrlFromRequest } from "@/lib/request-origin";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { safeLocalPath } from "@/lib/security/navigation";
import { createPasswordRecoveryCookieValue, PASSWORD_RECOVERY_COOKIE, PASSWORD_RECOVERY_MAX_AGE_SECONDS } from "@/lib/auth-recovery";

const allowedTypes = new Set<EmailOtpType>(["signup", "recovery", "email", "email_change"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextValue = request.nextUrl.searchParams.get("next") ?? "/";
  if (!tokenHash || !rawType || !allowedTypes.has(rawType)) return redirectTo(request, "/giris?error=invalid-link");
  const next = rawType === "recovery" ? "/sifre-yenile" : safeLocalPath(nextValue);

  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return redirectTo(request, "/giris?error=config");
  const { error } = await routeClient.supabase.auth.verifyOtp({ type: rawType, token_hash: tokenHash });
  if (error) return routeClient.applyTo(redirectTo(request, rawType === "recovery" ? "/sifremi-unuttum?error=expired" : "/giris?error=invalid-link"));

  const response = redirectTo(request, next);
  if (rawType === "recovery") {
    const { data } = await routeClient.supabase.auth.getUser();
    if (!data.user?.id) return routeClient.applyTo(redirectTo(request, "/sifremi-unuttum?error=expired"));
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, createPasswordRecoveryCookieValue(data.user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
    });
  }
  return routeClient.applyTo(response);
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(publicUrlFromRequest(request, path), 303);
}

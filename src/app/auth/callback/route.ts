import { NextResponse, type NextRequest } from "next/server";
import { publicUrlFromRequest } from "@/lib/request-origin";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { migrateCurrentSessionFavorites } from "@/lib/auth-favorites";
import { safeLocalPath } from "@/lib/security/navigation";
import { ensureProfileForAuthUser } from "@/lib/auth-profiles";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import {
  createPasswordRecoveryCookieValue,
  hasValidPasswordRecoveryIntent,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_MAX_AGE_SECONDS,
} from "@/lib/auth-recovery";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeLocalPath(requestUrl.searchParams.get("next"));
  const recoveryIntent = requestUrl.searchParams.get("recovery");
  const callbackError = requestUrl.searchParams.get("error");

  if (callbackError) {
    const errorPath = next === "/sifre-yenile" ? "/sifremi-unuttum?error=expired" : "/giris?error=callback";
    return redirectTo(request, errorPath);
  }
  if (!code) return redirectTo(request, "/giris?error=callback");
  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return redirectTo(request, "/giris?error=config");

  const { error } = await routeClient.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errorPath = next === "/sifre-yenile" ? "/sifremi-unuttum?error=expired" : "/giris?error=callback";
    return routeClient.applyTo(redirectTo(request, errorPath));
  }

  const { data } = await routeClient.supabase.auth.getUser();
  if (!data.user?.id) return routeClient.applyTo(redirectTo(request, "/giris?error=callback"));
  if (next === "/sifre-yenile" && !hasValidPasswordRecoveryIntent(recoveryIntent, data.user.email ?? "")) {
    await routeClient.supabase.auth.signOut();
    return routeClient.applyTo(redirectTo(request, "/sifremi-unuttum?error=expired"));
  }
  try {
    await ensureProfileForAuthUser(data.user);
    const service = createSupabaseServiceClient();
    const { data: profile } = service ? await service.from("profiles").select("status").eq("user_id", data.user.id).maybeSingle() : { data: null };
    if ((profile as { status?: string } | null)?.status === "blocked") {
      await routeClient.supabase.auth.signOut();
      return routeClient.applyTo(redirectTo(request, "/giris?error=blocked"));
    }
    await migrateCurrentSessionFavorites(data.user.id);
  } catch {
    await routeClient.supabase.auth.signOut();
    return routeClient.applyTo(redirectTo(request, "/giris?error=profile"));
  }

  const response = redirectTo(request, next);
  if (next === "/sifre-yenile") setRecoveryCookie(response, request, data.user.id);
  return routeClient.applyTo(response);
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(publicUrlFromRequest(request, path), 303);
}

function setRecoveryCookie(response: NextResponse, request: NextRequest, userId: string) {
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, createPasswordRecoveryCookieValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
  });
}

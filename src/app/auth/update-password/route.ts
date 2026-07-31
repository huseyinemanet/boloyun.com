import { NextResponse, type NextRequest } from "next/server";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { publicUrlFromRequest } from "@/lib/request-origin";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { hasValidPasswordRecoveryCookie, PASSWORD_RECOVERY_COOKIE } from "@/lib/auth-recovery";
import { meetsAuthPasswordMinimum } from "@/lib/auth-password-policy";

export async function POST(request: NextRequest) {
  if (!hasTrustedMutationOrigin(request)) return redirectTo(request, "/sifre-yenile?error=form");

  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return redirectTo(request, "/sifre-yenile?error=config");
  const { data: userResult, error: userError } = await routeClient.supabase.auth.getUser();
  if (userError || !userResult.user) return routeClient.applyTo(redirectTo(request, "/sifremi-unuttum?error=expired"));
  if (!hasValidPasswordRecoveryCookie(request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value, userResult.user.id)) {
    return routeClient.applyTo(redirectTo(request, "/sifremi-unuttum?error=expired"));
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
  if (!meetsAuthPasswordMinimum(password)) return routeClient.applyTo(redirectTo(request, "/sifre-yenile?error=weak"));
  if (password !== passwordConfirmation) return routeClient.applyTo(redirectTo(request, "/sifre-yenile?error=mismatch"));

  const { error } = await routeClient.supabase.auth.updateUser({ password });
  if (error) return routeClient.applyTo(redirectTo(request, "/sifre-yenile?error=update"));

  await routeClient.supabase.auth.signOut();
  const response = redirectTo(request, "/giris?notice=password-updated");
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, "", { path: "/", maxAge: 0 });
  return routeClient.applyTo(response);
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(publicUrlFromRequest(request, path), 303);
}

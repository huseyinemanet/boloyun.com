import { NextResponse, type NextRequest } from "next/server";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!hasTrustedMutationOrigin(request)) return redirectTo(request, "/sifre-yenile?error=form");
  if (request.cookies.get("password_recovery_pending")?.value !== "1") {
    return redirectTo(request, "/sifremi-unuttum?error=expired");
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
  if (password.length < 8) return redirectTo(request, "/sifre-yenile?error=weak");
  if (password !== passwordConfirmation) return redirectTo(request, "/sifre-yenile?error=mismatch");

  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return redirectTo(request, "/sifre-yenile?error=config");
  const { data: userResult, error: userError } = await routeClient.supabase.auth.getUser();
  if (userError || !userResult.user) return routeClient.applyTo(redirectTo(request, "/sifremi-unuttum?error=expired"));

  const { error } = await routeClient.supabase.auth.updateUser({ password });
  if (error) return routeClient.applyTo(redirectTo(request, "/sifre-yenile?error=update"));

  await routeClient.supabase.auth.signOut();
  const response = redirectTo(request, "/giris?notice=password-updated");
  response.cookies.set("password_recovery_pending", "", { path: "/", maxAge: 0 });
  return routeClient.applyTo(response);
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

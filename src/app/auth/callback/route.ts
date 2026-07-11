import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { migrateCurrentSessionFavorites } from "@/lib/auth-favorites";
import { safeLocalPath } from "@/lib/security/navigation";
import { ensureProfileForAuthUser } from "@/lib/auth-profiles";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeLocalPath(requestUrl.searchParams.get("next"));

  if (!code) return NextResponse.redirect(new URL("/giris?error=callback", request.url), 303);
  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return NextResponse.redirect(new URL("/giris?error=config", request.url), 303);

  const { error } = await routeClient.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errorPath = next === "/sifre-yenile" ? "/sifremi-unuttum?error=expired" : "/giris?error=callback";
    return routeClient.applyTo(NextResponse.redirect(new URL(errorPath, request.url), 303));
  }

  const { data } = await routeClient.supabase.auth.getUser();
  if (!data.user?.id) return routeClient.applyTo(NextResponse.redirect(new URL("/giris?error=callback", request.url), 303));
  try {
    await ensureProfileForAuthUser(data.user);
    const service = createSupabaseServiceClient();
    const { data: profile } = service ? await service.from("profiles").select("status").eq("user_id", data.user.id).maybeSingle() : { data: null };
    if ((profile as { status?: string } | null)?.status === "blocked") {
      await routeClient.supabase.auth.signOut();
      return routeClient.applyTo(NextResponse.redirect(new URL("/giris?error=blocked", request.url), 303));
    }
    await migrateCurrentSessionFavorites(data.user.id);
  } catch {
    await routeClient.supabase.auth.signOut();
    return routeClient.applyTo(NextResponse.redirect(new URL("/giris?error=profile", request.url), 303));
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  if (next === "/sifre-yenile") setRecoveryCookie(response, request);
  return routeClient.applyTo(response);
}

function setRecoveryCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set("password_recovery_pending", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 15 * 60,
  });
}

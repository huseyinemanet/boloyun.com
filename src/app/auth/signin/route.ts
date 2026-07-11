import { NextResponse, type NextRequest } from "next/server";
import { assertHumanForm, consumeRateLimits, getClientIp } from "@/lib/abuse";
import { ensureProfileForAuthUser } from "@/lib/auth-profiles";
import { migrateCurrentSessionFavorites } from "@/lib/auth-favorites";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { safeLocalPath } from "@/lib/security/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { verifyRiskChallenge } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  if (!hasTrustedMutationOrigin(request)) return redirectTo(request, "/giris?error=form");

  let formData: FormData;
  try {
    formData = await request.formData();
    assertHumanForm(formData);
  } catch {
    return redirectTo(request, "/giris?error=form");
  }

  const email = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr-TR");
  const password = String(formData.get("password") ?? "");
  const next = safeLocalPath(formData.get("next"));
  const rate = await consumeRateLimits([
    { action: "auth_login_ip", subject: await getClientIp(), limit: 20, windowSeconds: 900 },
    { action: "auth_login_email", subject: email, limit: 10, windowSeconds: 900 },
  ]);

  if (!rate.allowed && !await verifyRiskChallenge(formData, "login")) {
    return redirectTo(request, `/giris?error=challenge&challenge=1&next=${encodeURIComponent(next)}`);
  }

  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return redirectTo(request, "/giris?error=config");
  const { data, error } = await routeClient.supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return routeClient.applyTo(redirectTo(request, `/giris?error=invalid&next=${encodeURIComponent(next)}`));

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

  return routeClient.applyTo(redirectTo(request, next));
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

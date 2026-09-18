import { NextResponse, type NextRequest } from "next/server";
import { assertHumanForm, consumeRateLimits, getClientIp } from "@/lib/abuse";
import { ensureProfileForAuthUser } from "@/lib/auth-profiles";
import { migrateCurrentSessionActivity } from "@/lib/auth-favorites";
import { publicUrlFromRequest } from "@/lib/request-origin";
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

  const next = safeLocalPath(formData.get("next"));
  try {
    return await signIn(request, formData, next);
  } catch {
    // Fail closed when the shared rate limiter or Auth cannot be reached.
    // Never log credentials, email addresses, tokens or provider response bodies.
    console.error("[auth/signin] login dependency unavailable");
    return redirectTo(request, `/giris?error=unavailable&next=${encodeURIComponent(next)}`);
  }
}

async function signIn(request: NextRequest, formData: FormData, next: string) {
  const email = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr-TR");
  const password = String(formData.get("password") ?? "");
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
  if (error && (error.name === "AuthRetryableFetchError" || error.status === 0 || error.status === 429 || (error.status ?? 0) >= 500)) {
    return routeClient.applyTo(redirectTo(request, `/giris?error=unavailable&next=${encodeURIComponent(next)}`));
  }
  if (error || !data.user) return routeClient.applyTo(redirectTo(request, `/giris?error=invalid&next=${encodeURIComponent(next)}`));

  try {
    await ensureProfileForAuthUser(data.user);
    const service = createSupabaseServiceClient();
    const { data: profile } = service ? await service.from("profiles").select("status").eq("user_id", data.user.id).maybeSingle() : { data: null };
    if ((profile as { status?: string } | null)?.status === "blocked") {
      await routeClient.supabase.auth.signOut();
      return routeClient.applyTo(redirectTo(request, "/giris?error=blocked"));
    }
    await migrateCurrentSessionActivity(data.user.id);
  } catch {
    await routeClient.supabase.auth.signOut();
    return routeClient.applyTo(redirectTo(request, "/giris?error=profile"));
  }

  return routeClient.applyTo(redirectTo(request, next));
}

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(publicUrlFromRequest(request, path), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

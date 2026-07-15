import { NextResponse, type NextRequest } from "next/server";
import { assertHumanForm, consumeRateLimits, getClientIp } from "@/lib/abuse";
import { ensureProfileForAuthUser } from "@/lib/auth-profiles";
import { migrateCurrentSessionFavorites } from "@/lib/auth-favorites";
import { syncBrevoMarketingContact } from "@/lib/brevo-contacts";
import { getPublicSettings } from "@/lib/db-settings";
import { getRequestOrigin, publicUrlFromRequest } from "@/lib/request-origin";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { verifyRiskChallenge } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  if (!hasTrustedMutationOrigin(request)) return redirectTo(request, "/kayit?error=form");

  let formData: FormData;
  try {
    formData = await request.formData();
    assertHumanForm(formData);
  } catch {
    return redirectTo(request, "/kayit?error=form");
  }

  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return redirectTo(request, "/kayit?error=config");
  const { data: currentUser } = await routeClient.supabase.auth.getUser();
  if (currentUser.user) return routeClient.applyTo(redirectTo(request, "/profil"));

  const { general, community } = await getPublicSettings();
  if (!general.registrationsEnabled || !community.registrationsEnabled) return redirectTo(request, "/kayit?error=closed");

  const email = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr-TR");
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const termsAccepted = formData.get("terms_accepted") === "on";
  const marketingAccepted = formData.get("marketing_emails_accepted") === "on";
  const birthYear = Number(formData.get("birth_year") || 0) || null;

  if (!termsAccepted) return redirectTo(request, "/kayit?error=terms");
  let usernamePattern: RegExp;
  try { usernamePattern = new RegExp(community.usernamePattern); } catch { usernamePattern = /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/; }
  if (username.length < community.usernameMinLength || username.length > community.usernameMaxLength || !usernamePattern.test(username)) {
    return redirectTo(request, "/kayit?error=username");
  }
  if (community.minimumAge > 0 && (!birthYear || new Date().getFullYear() - birthYear < community.minimumAge)) {
    return redirectTo(request, "/kayit?error=age");
  }

  const rate = await consumeRateLimits([
    { action: "auth_signup_ip", subject: await getClientIp(), limit: 5, windowSeconds: 3600 },
    { action: "auth_signup_email", subject: email, limit: 3, windowSeconds: 86400 },
  ]);
  if (!rate.allowed && !await verifyRiskChallenge(formData, "signup")) {
    return redirectTo(request, "/kayit?error=challenge&challenge=1");
  }

  const { data, error } = await routeClient.supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await getRequestOrigin()}/auth/callback?next=/profil`,
      data: { username, display_name: username, birth_year: birthYear, terms_accepted: true, marketing_emails_accepted: marketingAccepted },
    },
  });

  if (error || !data.user) return routeClient.applyTo(redirectTo(request, "/kayit?error=email"));
  try {
    await ensureProfileForAuthUser(data.user, { username, termsAccepted: true, marketingEmailsAccepted: marketingAccepted, birthYear });
  } catch {
    await routeClient.supabase.auth.signOut();
    return routeClient.applyTo(redirectTo(request, "/kayit?error=create"));
  }

  if (marketingAccepted) {
    try {
      const brevoSync = await syncBrevoMarketingContact({ email, username });
      if (!brevoSync.ok || brevoSync.skipped) {
        console.warn("Brevo pazarlama kişi senkronizasyonu tamamlanmadı.", brevoSync);
      }
    } catch (syncError) {
      console.warn("Brevo pazarlama kişi senkronizasyonu hata verdi.", syncError);
    }
  }

  if (!data.session) return routeClient.applyTo(redirectTo(request, "/giris?notice=verify-email"));
  await migrateCurrentSessionFavorites(data.user.id);
  return routeClient.applyTo(redirectTo(request, "/profil?notice=registered"));
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(publicUrlFromRequest(request, path), 303);
}

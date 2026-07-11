"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfileForAuthUser } from "@/lib/auth-profiles";
import { migrateCurrentSessionFavorites } from "@/lib/auth-favorites";
import { getPublicSettings } from "@/lib/db-settings";
import { assertHumanForm, consumeRateLimits, getClientIp } from "@/lib/abuse";
import { verifyRiskChallenge } from "@/lib/turnstile";

export async function signUpAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/kayit?error=config");
  const { general, community } = await getPublicSettings();
  if (!general.registrationsEnabled || !community.registrationsEnabled) redirect("/kayit?error=closed");

  assertHumanForm(formData);
  const email = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr-TR");
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const termsAccepted = formData.get("terms_accepted") === "on";
  const marketingAccepted = formData.get("marketing_emails_accepted") === "on";
  const birthYear = Number(formData.get("birth_year") || 0) || null;

  if (!termsAccepted) {
    redirect("/kayit?error=terms");
  }

  let usernamePattern: RegExp;
  try { usernamePattern = new RegExp(community.usernamePattern); } catch { usernamePattern = /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/; }
  if (username.length < community.usernameMinLength || username.length > community.usernameMaxLength || !usernamePattern.test(username)) {
    redirect("/kayit?error=username");
  }

  if (community.minimumAge > 0 && (!birthYear || new Date().getFullYear() - birthYear < community.minimumAge)) redirect("/kayit?error=age");

  const rate = await consumeRateLimits([
    { action: "auth_signup_ip", subject: await getClientIp(), limit: 5, windowSeconds: 3600 },
    { action: "auth_signup_email", subject: email, limit: 3, windowSeconds: 86400 },
  ]);
  if (!rate.allowed && !await verifyRiskChallenge(formData, "signup")) {
    redirect("/kayit?error=challenge&challenge=1");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.SITE_URL || "http://localhost:3000"}/auth/callback?next=/profil`,
      data: { username, display_name: username, birth_year: birthYear, terms_accepted: true, marketing_emails_accepted: marketingAccepted },
    },
  });
  if (error || !data.user) redirect("/kayit?error=create");
  await ensureProfileForAuthUser(data.user, {
    username,
    termsAccepted: true,
    marketingEmailsAccepted: marketingAccepted,
    birthYear,
  });
  if (!data.session) redirect("/giris?notice=verify-email");
  await migrateCurrentSessionFavorites(data.user.id);
  redirect("/profil?notice=registered");
}

"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { migrateCurrentSessionFavorites } from "@/lib/auth-favorites";
import { ensureProfileForAuthUser } from "@/lib/auth-profiles";
import { getRequestOrigin } from "@/lib/request-origin";
import { assertHumanForm, consumeRateLimits, getClientIp } from "@/lib/abuse";
import { verifyRiskChallenge } from "@/lib/turnstile";
import { safeLocalPath } from "@/lib/security/navigation";

function safeNext(value: FormDataEntryValue | null) {
  return safeLocalPath(value);
}

export async function signInAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/giris?error=config");

  assertHumanForm(formData);
  const email = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr-TR");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const rate = await consumeRateLimits([
    { action: "auth_login_ip", subject: await getClientIp(), limit: 20, windowSeconds: 900 },
    { action: "auth_login_email", subject: email, limit: 10, windowSeconds: 900 },
  ]);
  if (!rate.allowed && !await verifyRiskChallenge(formData, "login")) {
    redirect(`/giris?error=challenge&challenge=1&next=${encodeURIComponent(next)}`);
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/giris?error=invalid&next=${encodeURIComponent(next)}`);
  }

  if (data.user?.id) {
    await ensureProfileForAuthUser(data.user);
    await migrateCurrentSessionFavorites(data.user.id);
  }

  redirect(next);
}

export async function signInWithGoogleAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/giris?error=config");

  const next = safeNext(formData.get("next"));
  const origin = await getRequestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/giris?error=google&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}

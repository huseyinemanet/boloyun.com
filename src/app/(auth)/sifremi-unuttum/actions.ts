"use server";

import { redirect } from "next/navigation";
import { createSupabasePasswordRecoveryClient } from "@/lib/supabase/client";
import { getRequestOrigin } from "@/lib/request-origin";
import { assertHumanForm, consumeRateLimits, getClientIp } from "@/lib/abuse";
import { verifyRiskChallenge } from "@/lib/turnstile";

export type ResetPasswordState = { sent: boolean };

export async function resetPasswordAction(_previous: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const supabase = createSupabasePasswordRecoveryClient();
  if (!supabase) redirect("/sifremi-unuttum?error=config");

  assertHumanForm(formData);
  const email = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr-TR");
  const rate = await consumeRateLimits([
    { action: "auth_recovery_ip", subject: await getClientIp(), limit: 10, windowSeconds: 3600 },
    { action: "auth_recovery_email", subject: email, limit: 3, windowSeconds: 3600 },
  ]);
  if (!rate.allowed && !await verifyRiskChallenge(formData, "recovery")) {
    redirect("/sifremi-unuttum?error=challenge&challenge=1");
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getRequestOrigin()}/sifre-yenile`,
  });

  if (error) {
    console.error("Password recovery email failed", { code: error.code, status: error.status });
    redirect("/sifremi-unuttum?error=reset");
  }

  return { sent: true };
}

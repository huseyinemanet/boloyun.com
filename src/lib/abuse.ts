import "server-only";

import { createHmac } from "crypto";
import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export type RateLimitRule = {
  action: string;
  subject: string;
  limit: number;
  windowSeconds: number;
};

export function assertHumanForm(formData: FormData, minimumFillMs = 700) {
  if (String(formData.get("website") ?? "").trim()) throw new Error("Form gönderilemedi.");
  const startedAt = Number(formData.get("form_started_at") ?? 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0 || Date.now() - startedAt < minimumFillMs) {
    throw new Error("Form çok hızlı gönderildi. Lütfen tekrar deneyin.");
  }
}

export async function getClientIp() {
  const values = await headers();
  const candidate = values.get("cf-connecting-ip") || values.get("x-real-ip") || values.get("x-forwarded-for")?.split(",")[0] || "unknown";
  return candidate.trim().slice(0, 128) || "unknown";
}

export function abuseSubject(value: string) {
  const secret = process.env.ABUSE_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("ABUSE_HASH_SECRET yapılandırılmamış.");
  return createHmac("sha256", secret).update(value.trim().toLocaleLowerCase("tr-TR")).digest("hex");
}

export async function consumeRateLimits(rules: RateLimitRule[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const results = await Promise.all(rules.map(async (rule) => {
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_action: rule.action,
      p_subject_hash: abuseSubject(rule.subject),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) throw new Error(`İstek sınırı kontrol edilemedi: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: Boolean((row as { allowed?: boolean } | null)?.allowed),
      retryAfterSeconds: Number((row as { retry_after_seconds?: number } | null)?.retry_after_seconds ?? rule.windowSeconds),
    };
  }));
  return {
    allowed: results.every((result) => result.allowed),
    retryAfterSeconds: Math.max(...results.map((result) => result.retryAfterSeconds), 1),
  };
}

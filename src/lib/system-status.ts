import { createSupabaseServiceClient } from "@/lib/supabase/client";

export type SystemStatus = {
  appVersion: string;
  database: "Bağlı" | "Bağlantı yok";
  r2: "Yapılandırıldı" | "Yapılandırılmadı";
  cdn: "Yapılandırıldı" | "Yapılandırılmadı";
  email: "Yapılandırıldı" | "Yapılandırılmadı";
  detectedIframeDomains: string[];
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const supabase = createSupabaseServiceClient();
  let database: SystemStatus["database"] = "Bağlantı yok";
  const domains = new Set<string>();

  if (supabase) {
    const [{ error: dbError }, { data: games }] = await Promise.all([
      supabase.from("games").select("id", { head: true, count: "exact" }).limit(1),
      supabase.from("games").select("embed_url, html5_url, swf_url, external_url").eq("status", "published").limit(1000),
    ]);
    database = dbError ? "Bağlantı yok" : "Bağlı";
    for (const game of (games ?? []) as Array<Record<string, string | null>>) {
      for (const value of Object.values(game)) {
        if (!value) continue;
        try { domains.add(new URL(value).hostname.toLocaleLowerCase("tr-TR")); } catch { /* Geçersiz eski adresleri durum kartında göstermeyiz. */ }
      }
    }
  }

  return {
    appVersion: process.env.npm_package_version || "0.1.0",
    database,
    r2: isR2Configured() ? "Yapılandırıldı" : "Yapılandırılmadı",
    cdn: isCdnConfigured() ? "Yapılandırıldı" : "Yapılandırılmadı",
    email: isEmailConfigured() ? "Yapılandırıldı" : "Yapılandırılmadı",
    detectedIframeDomains: [...domains].sort(),
  };
}

export function isR2Configured() {
  return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]
    .every((key) => Boolean(process.env[key]?.trim()));
}

export function isCdnConfigured() {
  return Boolean(process.env.R2_PUBLIC_BASE_URL?.trim());
}

export function isEmailConfigured() {
  const provider = process.env.EMAIL_SERVICE_PROVIDER?.trim().toLocaleLowerCase("tr-TR");
  const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim();
  const brevoApiKey = process.env.BREVO_API_KEY?.trim();
  const brevoMarketingListId = Number(process.env.BREVO_MARKETING_LIST_ID);

  return provider === "brevo" &&
    Boolean(fromAddress && /^[^\s@]+@boloyun\.com$/i.test(fromAddress)) &&
    Boolean(brevoApiKey) &&
    Number.isInteger(brevoMarketingListId) &&
    brevoMarketingListId > 0;
}

import { createSupabaseServiceClient } from "@/lib/supabase/client";

export type SystemStatus = {
  appVersion: string;
  database: "Bağlı" | "Bağlantı yok";
  r2: "Yapılandırıldı" | "Yapılandırılmadı";
  lastImportAt: string | null;
  detectedIframeDomains: string[];
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const supabase = createSupabaseServiceClient();
  let database: SystemStatus["database"] = "Bağlantı yok";
  let lastImportAt: string | null = null;
  const domains = new Set<string>();

  if (supabase) {
    const [{ error: dbError }, { data: imports }, { data: games }] = await Promise.all([
      supabase.from("games").select("id", { head: true, count: "exact" }).limit(1),
      supabase.from("game_imports").select("updated_at").order("updated_at", { ascending: false }).limit(1),
      supabase.from("games").select("embed_url, html5_url, swf_url, external_url").eq("status", "published").limit(1000),
    ]);
    database = dbError ? "Bağlantı yok" : "Bağlı";
    lastImportAt = (imports?.[0] as { updated_at?: string } | undefined)?.updated_at ?? null;
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
    lastImportAt,
    detectedIframeDomains: [...domains].sort(),
  };
}

export function isR2Configured() {
  return Boolean(process.env.R2_PUBLIC_BASE_URL);
}

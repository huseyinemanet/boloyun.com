import "server-only";

import { getAdminPopularGames } from "@/lib/db-games";
import { isCdnConfigured, isEmailConfigured, isR2Configured } from "@/lib/system-status";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { activityLabel } from "@/lib/admin-activity-label";

type AuditRow = {
  id: string;
  action: string;
  target_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | Array<{
    username: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  }> | null;
};

export type AdminOverviewData = Awaited<ReturnType<typeof getAdminOverviewData>>;

export async function getAdminOverviewData() {
  const supabase = createSupabaseServiceClient();
  const empty = emptyOverview();
  if (!supabase) return empty;

  const now = Date.now();
  const since24Hours = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7Days = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const queries = await Promise.all([
    supabase.from("games").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("comments").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("game_plays").select("id", { count: "exact", head: true }).gte("last_played_at", since24Hours),
    supabase.from("game_plays").select("id", { count: "exact", head: true }).gte("last_played_at", since7Days),
    supabase.from("game_imports").select("id", { count: "exact", head: true }).in("import_status", ["scraped", "ai_generated", "pending_review"]),
    supabase.from("game_imports").select("id", { count: "exact", head: true }).eq("import_status", "needs_fix"),
    supabase.from("game_imports").select("id", { count: "exact", head: true }).eq("import_status", "failed"),
    supabase.from("games").select("id", { count: "exact", head: true }).eq("is_broken", true),
    supabase.from("games").select("id", { count: "exact", head: true }).in("thumbnail_sync_status", ["pending", "failed", "rolled_back"]),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("admin_audit_events")
      .select("id, action, target_type, details, created_at, profiles(username, display_name, first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    getAdminPopularGames(10),
  ]);

  const countResults = queries.slice(0, 12) as Array<{ count: number | null; error: { message: string } | null }>;
  const databaseConnected = countResults.every((result) => !result.error);
  if (!databaseConnected) {
    console.error("[admin-overview] one or more count queries failed", countResults.flatMap((result) => result.error?.message ?? []));
  }

  const auditResult = queries[12] as { data: unknown; error: { message: string } | null };
  if (auditResult.error) console.error("[admin-overview] audit query failed", auditResult.error.message);

  return {
    totals: {
      games: value(countResults[0]),
      categories: value(countResults[1]),
      comments: value(countResults[2]),
      users: value(countResults[3]),
    },
    performance: {
      plays24Hours: value(countResults[4]),
      plays7Days: value(countResults[5]),
    },
    attention: {
      reviewImports: value(countResults[6]),
      needsFixImports: value(countResults[7]),
      failedImports: value(countResults[8]),
      brokenGames: value(countResults[9]),
      coverIssues: value(countResults[10]),
      pendingComments: value(countResults[11]),
    },
    activities: mapAuditRows((auditResult.data ?? []) as AuditRow[]),
    popularGames: queries[13] as Awaited<ReturnType<typeof getAdminPopularGames>>,
    system: {
      database: databaseConnected ? "Bağlı" as const : "Bağlantı yok" as const,
      r2: isR2Configured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      cdn: isCdnConfigured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      email: isEmailConfigured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      version: process.env.DEPLOYMENT_VERSION?.slice(0, 7) || process.env.npm_package_version || "0.1.0",
    },
  };
}

function value(result: { count: number | null }) {
  return result.count ?? 0;
}

function mapAuditRows(rows: AuditRow[]) {
  return rows.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    return {
      id: row.id,
      title: activityLabel(row.action),
      actor: profile?.display_name || fullName || profile?.username || "Sistem",
      target: detailLabel(row.details) || targetLabel(row.target_type),
      createdAt: row.created_at,
    };
  });
}

function targetLabel(targetType: string) {
  const labels: Record<string, string> = {
    game_import: "Import kaydı",
    game: "Oyun",
    comment: "Yorum",
    comments: "Yorumlar",
    profile: "Kullanıcı",
    site_settings: "Site ayarları",
    crawler: "Tarama",
  };
  return labels[targetType] ?? targetType;
}

function detailLabel(details: Record<string, unknown> | null) {
  if (!details) return "";
  for (const key of ["title", "sourceUrl", "section", "status"]) {
    const value = details[key];
    if (typeof value === "string" && value.trim()) {
      if (key === "section") return sectionLabel(value);
      return value;
    }
  }
  return "";
}

function sectionLabel(section: string) {
  const labels: Record<string, string> = {
    general: "Genel ayarlar",
    appearance: "Görünüm ayarları",
    games: "Oyun ayarları",
    integrations: "Entegrasyon ayarları",
    security: "Güvenlik ayarları",
    system: "Sistem ayarları",
  };
  return labels[section] ?? section;
}

function emptyOverview() {
  return {
    totals: { games: 0, categories: 0, comments: 0, users: 0 },
    performance: { plays24Hours: 0, plays7Days: 0 },
    attention: { reviewImports: 0, needsFixImports: 0, failedImports: 0, brokenGames: 0, coverIssues: 0, pendingComments: 0 },
    activities: [] as Array<{ id: string; title: string; actor: string; target: string; createdAt: string }>,
    popularGames: [] as Awaited<ReturnType<typeof getAdminPopularGames>>,
    system: {
      database: "Bağlantı yok" as const,
      r2: isR2Configured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      cdn: isCdnConfigured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      email: isEmailConfigured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      version: process.env.DEPLOYMENT_VERSION?.slice(0, 7) || process.env.npm_package_version || "0.1.0",
    },
  };
}

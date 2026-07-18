import "server-only";

import { isCdnConfigured, isEmailConfigured, isR2Configured } from "@/lib/system-status";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { activityLabel } from "@/lib/admin-activity-label";
import { normalizeSiteAssetUrl } from "@/lib/site-assets";
import { measuredQuery } from "@/lib/query-observability";

type AuditRow = {
  id: string;
  action: string;
  target_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | Array<{
    username: string;
    avatar_url: string | null;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  }> | null;
};

type AdminOverviewPopularGame = {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  thumbnailUrl: string;
  playCount: number;
  favoriteCount: number;
  likesCount: number;
  dislikesCount: number;
  ratingAvg: number;
  ratingCount: number;
  popularityScore: number;
};

type AdminOverviewSnapshot = {
  totals?: Partial<{ games: number; categories: number; comments: number; users: number }>;
  performance?: Partial<{ plays24Hours: number; plays7Days: number }>;
  attention?: Partial<{
    reviewImports: number;
    needsFixImports: number;
    failedImports: number;
    brokenGames: number;
    coverIssues: number;
    pendingComments: number;
  }>;
  activities?: AuditRow[];
  popularGames?: Array<Partial<AdminOverviewPopularGame> & Pick<AdminOverviewPopularGame, "id" | "title" | "slug">>;
};

export type AdminOverviewData = Awaited<ReturnType<typeof getAdminOverviewData>>;

export async function getAdminOverviewData() {
  const supabase = createSupabaseServiceClient();
  const empty = emptyOverview();
  if (!supabase) return empty;

  const now = Date.now();
  const since24Hours = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7Days = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await measuredQuery("admin.overview.snapshot", supabase.rpc(
    "get_admin_overview_snapshot",
    {
      p_since_24_hours: since24Hours,
      p_since_7_days: since7Days,
      p_popular_limit: 10,
    },
  ));
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    console.error("[admin-overview] snapshot query failed", error?.message ?? "invalid payload");
    return empty;
  }

  const snapshot = data as AdminOverviewSnapshot;

  return {
    totals: {
      games: numberValue(snapshot.totals?.games),
      categories: numberValue(snapshot.totals?.categories),
      comments: numberValue(snapshot.totals?.comments),
      users: numberValue(snapshot.totals?.users),
    },
    performance: {
      plays24Hours: numberValue(snapshot.performance?.plays24Hours),
      plays7Days: numberValue(snapshot.performance?.plays7Days),
    },
    attention: {
      reviewImports: numberValue(snapshot.attention?.reviewImports),
      needsFixImports: numberValue(snapshot.attention?.needsFixImports),
      failedImports: numberValue(snapshot.attention?.failedImports),
      brokenGames: numberValue(snapshot.attention?.brokenGames),
      coverIssues: numberValue(snapshot.attention?.coverIssues),
      pendingComments: numberValue(snapshot.attention?.pendingComments),
    },
    activities: mapAuditRows(snapshot.activities ?? []),
    popularGames: mapPopularGames(snapshot.popularGames ?? []),
    system: {
      database: "Bağlı" as const,
      r2: isR2Configured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      cdn: isCdnConfigured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      email: isEmailConfigured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      version: process.env.DEPLOYMENT_VERSION?.slice(0, 7) || process.env.npm_package_version || "0.1.0",
    },
  };
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function mapPopularGames(rows: AdminOverviewSnapshot["popularGames"]): AdminOverviewPopularGame[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    categoryName: typeof row.categoryName === "string" ? row.categoryName : "",
    thumbnailUrl: normalizeSiteAssetUrl(row.thumbnailUrl) ?? "/thumbnails/space.svg",
    playCount: numberValue(row.playCount),
    favoriteCount: numberValue(row.favoriteCount),
    likesCount: numberValue(row.likesCount),
    dislikesCount: numberValue(row.dislikesCount),
    ratingAvg: numberValue(row.ratingAvg),
    ratingCount: numberValue(row.ratingCount),
    popularityScore: numberValue(row.popularityScore),
  }));
}

function mapAuditRows(rows: AuditRow[]) {
  return rows.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    return {
      id: row.id,
      title: activityLabel(row.action),
      actor: profile?.display_name || fullName || profile?.username || "Sistem",
      actorAvatarUrl: normalizeSiteAssetUrl(profile?.avatar_url),
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
    activities: [] as Array<{ id: string; title: string; actor: string; actorAvatarUrl: string | null; target: string; createdAt: string }>,
    popularGames: [] as AdminOverviewPopularGame[],
    system: {
      database: "Bağlantı yok" as const,
      r2: isR2Configured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      cdn: isCdnConfigured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      email: isEmailConfigured() ? "Bağlı" as const : "Yapılandırılmadı" as const,
      version: process.env.DEPLOYMENT_VERSION?.slice(0, 7) || process.env.npm_package_version || "0.1.0",
    },
  };
}

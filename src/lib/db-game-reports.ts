import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import type { GameReportReason } from "@/lib/game-report-validation";

export type GameReportStatus = "pending" | "reviewing" | "resolved" | "rejected";

export type CreatedGameReport = {
  id: string;
  created: boolean;
  gameTitle: string;
  gameSlug: string;
};

type ContentReportRow = {
  id: string;
  reporter_profile_id: string | null;
  game_id: string;
  reason: string;
  details: string | null;
  status: GameReportStatus;
  created_at: string;
  updated_at: string;
};

type GameRow = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  is_broken: boolean | null;
};

type ProfileRow = { id: string; username: string | null };

export type AdminGameReport = {
  id: string;
  reason: string;
  details: string | null;
  status: GameReportStatus;
  reporterUsername: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminGameReportGroup = {
  game: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    isBroken: boolean;
  };
  reports: AdminGameReport[];
  openCount: number;
  latestAt: string;
};

export async function createGameReport(input: {
  gameId: string;
  reporterProfileId: string | null;
  reporterSubjectHash: string;
  reason: GameReportReason;
  details: string | null;
}): Promise<CreatedGameReport> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { data, error } = await supabase.rpc("create_game_report_atomic", {
    p_game_id: input.gameId,
    p_reporter_profile_id: input.reporterProfileId,
    p_reporter_subject_hash: input.reporterSubjectHash,
    p_reason: input.reason,
    p_details: input.details,
  });
  if (error) throw new Error(`Oyun bildirimi kaydedilemedi: ${error.message}`);
  const row = data as Record<string, unknown> | null;
  if (!row?.id || !row.game_title || !row.game_slug) throw new Error("Oyun bildirimi sonucu okunamadı.");
  return {
    id: String(row.id),
    created: Boolean(row.created),
    gameTitle: String(row.game_title),
    gameSlug: String(row.game_slug),
  };
}

export async function getOpenGameReportCount() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .not("game_id", "is", null)
    .in("status", ["pending", "reviewing"]);
  if (error) throw new Error(`Oyun bildirim sayısı okunamadı: ${error.message}`);
  return count ?? 0;
}

export async function getAdminGameReportGroups(status?: GameReportStatus): Promise<AdminGameReportGroup[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  let query = supabase
    .from("content_reports")
    .select("id, reporter_profile_id, game_id, reason, details, status, created_at, updated_at")
    .not("game_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Oyun bildirimleri okunamadı: ${error.message}`);
  const reports = (data ?? []) as ContentReportRow[];
  if (reports.length === 0) return [];

  const gameIds = [...new Set(reports.map((report) => report.game_id))];
  const profileIds = [...new Set(reports.map((report) => report.reporter_profile_id).filter((id): id is string => Boolean(id)))];
  const [{ data: gameData, error: gameError }, { data: profileData, error: profileError }] = await Promise.all([
    supabase.from("games").select("id, title, slug, thumbnail_url, is_broken").in("id", gameIds),
    profileIds.length > 0
      ? supabase.from("profiles").select("id, username").in("id", profileIds)
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
  ]);
  if (gameError) throw new Error(`Bildirilen oyunlar okunamadı: ${gameError.message}`);
  if (profileError) throw new Error(`Bildirim sahipleri okunamadı: ${profileError.message}`);

  const games = new Map(((gameData ?? []) as GameRow[]).map((game) => [game.id, game]));
  const profiles = new Map(((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.username]));
  const groups = new Map<string, AdminGameReportGroup>();

  for (const report of reports) {
    const game = games.get(report.game_id);
    if (!game) continue;
    const existing = groups.get(game.id) ?? {
      game: {
        id: game.id,
        title: game.title,
        slug: game.slug,
        thumbnailUrl: game.thumbnail_url,
        isBroken: Boolean(game.is_broken),
      },
      reports: [],
      openCount: 0,
      latestAt: report.updated_at,
    };
    existing.reports.push({
      id: report.id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      reporterUsername: report.reporter_profile_id ? profiles.get(report.reporter_profile_id) ?? null : null,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    });
    if (report.status === "pending" || report.status === "reviewing") existing.openCount += 1;
    groups.set(game.id, existing);
  }

  return [...groups.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export async function updateGameReportStatuses(input: {
  ids: string[];
  status: GameReportStatus;
  reviewerProfileId: string;
}) {
  if (input.ids.length === 0) return;
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const isClosed = input.status === "resolved" || input.status === "rejected";
  const { error } = await supabase
    .from("content_reports")
    .update({
      status: input.status,
      reviewed_by_profile_id: input.reviewerProfileId,
      resolved_at: isClosed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .in("id", input.ids)
    .not("game_id", "is", null);
  if (error) throw new Error(`Oyun bildirim durumu güncellenemedi: ${error.message}`);
}

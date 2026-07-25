import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { getIstanbulDayKey, rotateGamesForDay } from "@/lib/daily-game-rotation";
import { mapGameRow, type GameRow } from "@/lib/games/model";
import { getPopularPublishedGames, getPublishedGames, getPublishedGamesByCategorySlug, getPublishedGamesByIds, getTrendingPublishedGames } from "@/lib/games/public-queries";
import { allowPublicDemoData, publicDataUnavailable } from "@/lib/public-data-guard";
import type { Game } from "@/types/game";

export const HOMEPAGE_FEATURED_GAME_LIMIT = 20;
const HOMEPAGE_CANDIDATE_LIMIT = 60;

export type HomepageSectionInput = {
  id: string | null;
  title: string;
  sectionType: "manual_games" | "latest_games" | "popular_games" | "trending_games" | "category_based" | "tag_based" | "continue_playing" | "favorites" | "random_picks";
  sourceType: "category" | "tag" | "";
  sourceId: string;
  manualGameIds: string[];
  limitCount: number;
  sortOrder: number;
  visibility: "all" | "desktop" | "mobile" | "members";
  status: "active" | "inactive";
};

type HomepageSectionRow = {
  id: string;
  title: string;
  section_type: HomepageSectionInput["sectionType"];
  source_type: string | null;
  source_id: string | null;
  manual_game_ids: unknown;
  limit_count: number | null;
  sort_order: number | null;
  visibility: string | null;
  status: string | null;
};

type PublicHomepageSectionRpcRow = Omit<HomepageSectionRow, "manual_game_ids" | "status"> & {
  games?: GameRow[];
};

type PublicHomepageRpc = {
  sections?: PublicHomepageSectionRpcRow[];
  latest_games?: GameRow[];
};

export async function getHomepageSectionsAdmin(): Promise<HomepageSectionInput[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("id, title, section_type, source_type, source_id, manual_game_ids, limit_count, sort_order, visibility, status")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as HomepageSectionRow[]).map(mapSection);
}

export async function saveHomepageSections(input: HomepageSectionInput[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase bağlantısı yapılandırılmamış.");
  const sections = input.map((section, index) => validateSection(section, index));
  const { error } = await supabase.rpc("save_homepage_sections_atomic", {
    p_sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      section_type: section.sectionType,
      source_type: section.sourceType,
      source_id: section.sourceId,
      manual_game_ids: section.manualGameIds,
      limit_count: section.limitCount,
      sort_order: section.sortOrder,
      visibility: section.visibility,
      status: section.status,
    })),
  });
  if (error) throw new Error(`Ana sayfa bölümleri kaydedilemedi: ${error.message}`);
}

const getPublicHomepageSnapshotCached = unstable_cache(async function getPublicHomepageSnapshotCached(): Promise<{ sections: Array<{ section: HomepageSectionInput; games: Game[] }>; latestGames: Game[]; popularGames: Game[]; trendingGames: Game[] }> {
  const supabase = createSupabaseServiceClient();
  const dayKey = getIstanbulDayKey();
  if (!supabase && !allowPublicDemoData()) {
    throw publicDataUnavailable("Ana sayfa", "Supabase yapılandırması eksik");
  }
  if (supabase) {
    const { data, error } = await supabase.rpc("get_public_homepage", {
      p_section_limit: HOMEPAGE_FEATURED_GAME_LIMIT,
      p_all_limit: HOMEPAGE_CANDIDATE_LIMIT,
    });
    if (!error && data && typeof data === "object") {
      const snapshot = data as PublicHomepageRpc;
      const sectionRows = Array.isArray(snapshot.sections) ? snapshot.sections : [];
      const latestGames = rotateGamesForDay(
        (Array.isArray(snapshot.latest_games) ? snapshot.latest_games : []).map(mapGameRow),
        dayKey,
        "latest",
      );
      const needsPopularGames = sectionRows.length === 0 || sectionRows.some((row) => row.section_type === "popular_games");
      const needsTrendingGames = sectionRows.length === 0 || sectionRows.some((row) => row.section_type === "trending_games");
      const [popularGames, trendingCandidates] = await Promise.all([
        needsPopularGames ? getPopularPublishedGames(HOMEPAGE_CANDIDATE_LIMIT) : Promise.resolve([]),
        needsTrendingGames ? getTrendingPublishedGames(HOMEPAGE_CANDIDATE_LIMIT) : Promise.resolve([]),
      ]);
      const trendingGames = rotateGamesForDay(trendingCandidates, dayKey, "trending");
      const sections = sectionRows.map((row) => ({
        section: mapSection({
          ...row,
          manual_game_ids: [],
          status: "active",
        }),
        games: row.section_type === "latest_games"
          ? latestGames
          : row.section_type === "popular_games"
            ? popularGames
            : row.section_type === "trending_games"
              ? trendingGames
              : (Array.isArray(row.games) ? row.games : []).map(mapGameRow),
      }));
      return {
        sections,
        latestGames,
        popularGames: sections.length ? [] : popularGames,
        trendingGames: sections.length ? [] : trendingGames,
      };
    }
  }

  const sections = (await getHomepageSectionsAdmin()).filter((section) => section.status === "active");
  const publicSections = sections.filter((section) => section.visibility !== "members");
  const needsSharedGames = publicSections.some((section) => !["manual_games", "category_based", "tag_based"].includes(section.sectionType));
  const sharedGames = needsSharedGames ? await getPublishedGames(HOMEPAGE_CANDIDATE_LIMIT) : [];
  const [resolvedSections, latestCandidates, popularGames, trendingCandidates] = await Promise.all([
    Promise.all(publicSections.map(async (section) => ({
      section: { ...section, limitCount: renderedSectionLimit(section) },
      games: await resolveSectionGames({ ...section, limitCount: sectionCandidateLimit(section) }, sharedGames),
    }))),
    sharedGames.length ? Promise.resolve(sharedGames) : getPublishedGames(HOMEPAGE_CANDIDATE_LIMIT),
    publicSections.length ? Promise.resolve([]) : getPopularPublishedGames(HOMEPAGE_CANDIDATE_LIMIT),
    publicSections.length ? Promise.resolve([]) : getTrendingPublishedGames(HOMEPAGE_CANDIDATE_LIMIT),
  ]);
  const latestGames = rotateGamesForDay(latestCandidates, dayKey, "latest");
  const trendingGames = rotateGamesForDay(trendingCandidates, dayKey, "trending");
  return {
    sections: resolvedSections.map(({ section, games }) => ({
      section,
      games: section.sectionType === "latest_games"
        ? rotateGamesForDay(games, dayKey, "latest")
        : section.sectionType === "trending_games"
          ? rotateGamesForDay(games, dayKey, "trending")
          : games,
    })),
    latestGames,
    popularGames,
    trendingGames,
  };
}, ["public-homepage-snapshot-v7"], { revalidate: 3600, tags: ["homepage-sections", "games", "categories", "tags"] });

export async function getPublicHomepageSnapshot() {
  return getPublicHomepageSnapshotCached();
}

export async function getHomepageSectionsPublic() {
  return (await getPublicHomepageSnapshotCached()).sections;
}

async function resolveSectionGames(section: HomepageSectionInput, sharedGames: Game[]): Promise<Game[]> {
  if (section.sectionType === "manual_games") {
    const games = await getPublishedGamesByIds(section.manualGameIds);
    const byId = new Map(games.map((game) => [game.id, game]));
    return section.manualGameIds.flatMap((id) => byId.get(id) ?? []).slice(0, section.limitCount);
  }
  if (section.sectionType === "category_based" && section.sourceId) {
    const slug = await getTaxonomySlug("categories", section.sourceId);
    return slug ? getPublishedGamesByCategorySlug(slug, section.limitCount) : [];
  }
  if (section.sectionType === "tag_based" && section.sourceId) return getPublishedGamesByTagId(section.sourceId, section.limitCount);
  const games = sharedGames;
  if (section.sectionType === "popular_games") return games.toSorted((a, b) => b.playCount - a.playCount).slice(0, section.limitCount);
  if (section.sectionType === "trending_games") return getTrendingPublishedGames(section.limitCount);
  if (section.sectionType === "random_picks") return shuffled(games).slice(0, section.limitCount);
  return games.slice(0, section.limitCount);
}

function sectionCandidateLimit(section: HomepageSectionInput) {
  return ["latest_games", "popular_games", "trending_games"].includes(section.sectionType)
    ? HOMEPAGE_CANDIDATE_LIMIT
    : renderedSectionLimit(section);
}

function renderedSectionLimit(section: HomepageSectionInput) {
  return ["latest_games", "popular_games", "trending_games"].includes(section.sectionType)
    ? HOMEPAGE_FEATURED_GAME_LIMIT
    : Math.min(section.limitCount, HOMEPAGE_FEATURED_GAME_LIMIT);
}

function shuffled(games: Game[]) {
  const result = [...games];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

async function getTaxonomySlug(table: "categories" | "tags", id: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select("slug").eq("id", id).maybeSingle();
  return error ? null : (data as { slug?: string } | null)?.slug ?? null;
}

async function getPublishedGamesByTagId(tagId: string, limit: number) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("game_tags").select("game_id").eq("tag_id", tagId).limit(limit);
  if (error || !data) return [];
  return getPublishedGamesByIds((data as Array<{ game_id: string }>).map((row) => row.game_id));
}

function validateSection(section: HomepageSectionInput, index: number): HomepageSectionInput {
  const sectionTypes: HomepageSectionInput["sectionType"][] = ["manual_games", "latest_games", "popular_games", "trending_games", "category_based", "tag_based", "continue_playing", "favorites", "random_picks"];
  const visibilities: HomepageSectionInput["visibility"][] = ["all", "desktop", "mobile", "members"];
  if (!sectionTypes.includes(section.sectionType)) throw new Error(`${index + 1}. bölüm türü geçersiz.`);
  if (!visibilities.includes(section.visibility)) throw new Error(`${index + 1}. bölüm görünürlüğü geçersiz.`);
  if (section.status !== "active" && section.status !== "inactive") throw new Error(`${index + 1}. bölüm durumu geçersiz.`);
  if (section.id !== null && !isUuid(section.id)) throw new Error(`${index + 1}. bölüm kimliği geçersiz.`);
  const title = String(section.title ?? "").trim();
  if (title.length < 2 || title.length > 100) throw new Error(`${index + 1}. bölüm başlığı geçersiz.`);
  if (!Number.isInteger(section.limitCount) || section.limitCount < 1 || section.limitCount > 60) throw new Error(`${title} oyun limiti geçersiz.`);
  const manualGameIds = section.manualGameIds.filter(isUuid);
  const sourceId = section.sourceId && isUuid(section.sourceId) ? section.sourceId : "";
  if ((section.sectionType === "category_based" || section.sectionType === "tag_based") && !sourceId) throw new Error(`${title} için kaynak kimliği gerekli.`);
  return { ...section, title, manualGameIds, sourceId, sortOrder: index };
}

function mapSection(row: HomepageSectionRow): HomepageSectionInput {
  return {
    id: row.id,
    title: row.title,
    sectionType: row.section_type,
    sourceType: row.source_type === "category" || row.source_type === "tag" ? row.source_type : "",
    sourceId: row.source_id ?? "",
    manualGameIds: Array.isArray(row.manual_game_ids) ? row.manual_game_ids.filter((item): item is string => typeof item === "string") : [],
    limitCount: row.limit_count ?? 12,
    sortOrder: row.sort_order ?? 0,
    visibility: isVisibility(row.visibility) ? row.visibility : "all",
    status: row.status === "inactive" ? "inactive" : "active",
  };
}

function isVisibility(value: string | null): value is HomepageSectionInput["visibility"] {
  return value === "all" || value === "desktop" || value === "mobile" || value === "members";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

import { createClient } from "@supabase/supabase-js";
import { categories as fallbackCategories, games as fallbackGames } from "@/lib/data";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { isTagIndexable } from "@/lib/seo/audit";
import type { Game, GameType, PublishStatus } from "@/types/game";

export type TaxonomyLink = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  isIndexable?: boolean;
  publishedGameCount?: number;
};

export type StaticSettings = typeof DEFAULT_SETTINGS;

export type GameDetail = {
  game: Game;
  categories: TaxonomyLink[];
  tags: TaxonomyLink[];
  comments: PublicComment[];
};

export type PublicComment = {
  id: string;
  body: string;
  username: string;
  displayName: string;
  createdAt: string;
  likesCount: number;
};

export type PublicAd = {
  slotKey: string;
  code: string;
};

type SupabaseClient = ReturnType<typeof createClient>;

type GameRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  how_to_play: string | null;
  controls: string[] | null;
  features: string[] | null;
  developer: string | null;
  thumbnail_url: string | null;
  game_type: GameType;
  embed_url: string | null;
  swf_url: string | null;
  html5_url: string | null;
  external_url: string | null;
  source_url: string | null;
  source_domain: string | null;
  status: PublishStatus;
  rating_avg: number | null;
  rating_count: number | null;
  likes_count: number | null;
  dislikes_count: number | null;
  play_count: number | null;
  seo_title: string | null;
  seo_description: string | null;
  primary_category_id: string | null;
  og_image_url: string | null;
  is_indexable: boolean | null;
  is_broken: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SettingsRow = {
  section: keyof StaticSettings;
  value: unknown;
};

type StaticPageRow = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  content_json?: {
    updatedAt?: string;
    sections?: Array<{ heading: string; paragraphs: string[] }>;
  } | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  is_indexable: boolean | null;
  updated_at: string | null;
};

type HomepageSectionRow = {
  id: string;
  title: string;
  section_type: string;
  source_type: string | null;
  source_id: string | null;
  manual_game_ids: unknown;
  limit_count: number | null;
  sort_order: number | null;
  visibility: string | null;
  status: string | null;
};

const gameSelect = [
  "id",
  "title",
  "slug",
  "short_description",
  "long_description",
  "how_to_play",
  "controls",
  "features",
  "developer",
  "thumbnail_url",
  "game_type",
  "embed_url",
  "swf_url",
  "html5_url",
  "external_url",
  "source_url",
  "source_domain",
  "status",
  "rating_avg",
  "rating_count",
  "likes_count",
  "dislikes_count",
  "play_count",
  "seo_title",
  "seo_description",
  "primary_category_id",
  "og_image_url",
  "is_indexable",
  "is_broken",
  "created_at",
  "updated_at",
].join(",");

export function getStaticClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getSettings(): Promise<StaticSettings> {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const supabase = getStaticClient();
  if (!supabase) return settings;
  const { data } = await supabase.from("site_settings").select("section, value");
  for (const row of (data ?? []) as SettingsRow[]) {
    if (row.section in settings && row.value && typeof row.value === "object") {
      Object.assign(settings[row.section], row.value);
    }
  }
  return settings;
}

export async function getAllPublishedGameSlugs() {
  const supabase = getStaticClient();
  if (!supabase) return fallbackGames.filter((game) => game.status === "published").map((game) => game.slug);
  return (await fetchAllRows<{ slug: string }>(supabase, "games", "slug", (query) =>
    query.eq("status", "published").eq("is_broken", false).order("updated_at", { ascending: false }))).map((row) => row.slug);
}

export async function getAllCategorySlugs() {
  const supabase = getStaticClient();
  if (!supabase) return fallbackCategories.map((category) => category.slug);
  return (await fetchAllRows<{ slug: string }>(supabase, "categories", "slug", (query) =>
    query.eq("status", "active").order("name"))).map((row) => row.slug);
}

export async function getAllTagSlugs() {
  const tags = await getTags();
  return tags.filter((tag) => tag.isIndexable).map((tag) => tag.slug);
}

export async function getAllStaticPageSlugs() {
  const supabase = getStaticClient();
  if (!supabase) return fallbackStaticPages.map((page) => page.slug);
  return (await fetchAllRows<{ slug: string }>(supabase, "static_pages", "slug", (query) =>
    query.eq("status", "published").eq("is_indexable", true).order("updated_at", { ascending: false }))).map((row) => row.slug);
}

export async function getHomeData() {
  const [settings, latestGames, allGames, sections] = await Promise.all([
    getSettings(),
    getPublishedGames(90),
    getPublishedGamesPage(1, 60),
    getHomepageSections(),
  ]);
  const resolvedSections = await Promise.all(sections.map((section) => resolveHomepageSection(section, latestGames)));
  return { settings, latestGames, allGames, sections: resolvedSections.filter((section) => section.games.length > 0) };
}

export async function getPublishedGames(limit = 60) {
  const supabase = getStaticClient();
  if (!supabase) return fallbackGames.filter((game) => game.status === "published").slice(0, limit);
  const { data } = await supabase
    .from("games")
    .select(gameSelect)
    .eq("status", "published")
    .eq("is_broken", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as GameRow[]).map(mapGameRow);
}

export async function getPublishedGamesPage(page: number, perPage: number) {
  const supabase = getStaticClient();
  if (!supabase) {
    const games = fallbackGames.filter((game) => game.status === "published");
    return { items: games.slice((page - 1) * perPage, page * perPage), total: games.length };
  }
  const from = (page - 1) * perPage;
  const { data, count } = await supabase
    .from("games")
    .select(gameSelect, { count: "exact" })
    .eq("status", "published")
    .eq("is_broken", false)
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);
  return { items: ((data ?? []) as GameRow[]).map(mapGameRow), total: count ?? 0 };
}

export async function getGameDetail(slug: string): Promise<GameDetail | null> {
  const supabase = getStaticClient();
  if (!supabase) {
    const game = fallbackGames.find((item) => item.slug === slug && item.status === "published");
    return game ? { game, categories: [], tags: [], comments: [] } : null;
  }
  const { data: gameRow } = await supabase
    .from("games")
    .select(gameSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("is_broken", false)
    .maybeSingle();
  if (!gameRow) return null;
  const game = mapGameRow(gameRow as GameRow);
  const [categories, tags, comments] = await Promise.all([
    getGameCategories(game.id),
    getGameTags(game.id),
    getApprovedComments(game.id),
  ]);
  return {
    game: { ...game, categories: categories.map((category) => category.slug), tags: tags.map((tag) => tag.name) },
    categories: prioritizeTaxonomy(categories, game.primaryCategoryId),
    tags,
    comments,
  };
}

export async function getCategoryPage(slug: string, page: number, perPage: number) {
  const supabase = getStaticClient();
  if (!supabase) {
    const category = fallbackCategories.find((item) => item.slug === slug);
    if (!category) return null;
    const allItems = fallbackGames.filter((game) => game.status === "published" && game.categories.includes(slug));
    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        isIndexable: true,
      },
      items: allItems.slice((page - 1) * perPage, page * perPage),
      total: allItems.length,
    };
  }
  const { data: category } = await supabase.from("categories").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!category) return null;
  const categoryRow = category as { id: string };
  const from = (page - 1) * perPage;
  const { data, count } = await supabase
    .from("game_categories")
    .select("game_id, games!inner(id)", { count: "exact" })
    .eq("category_id", categoryRow.id)
    .eq("games.status", "published")
    .range(from, from + perPage - 1);
  const games = await getPublishedGamesByIds(((data ?? []) as Array<{ game_id: string }>).map((row) => row.game_id));
  return { category: mapTaxonomy(category), items: games, total: count ?? 0 };
}

export async function getTagPage(slug: string, page: number, perPage: number) {
  const tag = (await getTags()).find((item) => item.slug === slug);
  if (!tag) return null;
  const supabase = getStaticClient();
  if (!supabase) {
    const allItems = fallbackGames.filter((game) => game.status === "published" && game.tags.some((item) => slugify(item) === slug));
    return { tag, items: allItems.slice((page - 1) * perPage, page * perPage), total: allItems.length };
  }
  const from = (page - 1) * perPage;
  const { data, count } = await supabase
    .from("game_tags")
    .select("game_id, games!inner(id)", { count: "exact" })
    .eq("tag_id", tag.id)
    .eq("games.status", "published")
    .range(from, from + perPage - 1);
  const games = await getPublishedGamesByIds(((data ?? []) as Array<{ game_id: string }>).map((row) => row.game_id));
  return { tag, items: games, total: count ?? 0 };
}

export async function getStaticPage(slug: string) {
  const supabase = getStaticClient();
  if (!supabase) {
    const page = fallbackStaticPages.find((item) => item.slug === slug);
    return page ?? null;
  }
  const { data } = await supabase.from("static_pages").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) return null;
  const row = data as StaticPageRow;
  const sections = row.content_json?.sections?.length
    ? row.content_json.sections
    : parseStaticContent(row.content);
  return {
    title: row.title,
    slug: row.slug,
    description: row.seo_description || "Bol Oyun bilgilendirme sayfası.",
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogImageUrl: row.og_image_url,
    isIndexable: row.is_indexable ?? true,
    updatedAt: row.content_json?.updatedAt || formatDate(row.updated_at),
    sections,
  };
}

export async function getPublicAd(slotKey: string): Promise<PublicAd | null> {
  const supabase = getStaticClient();
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("ads")
    .select("ad_slots!inner(slot_key), code, enabled, start_at, end_at, target_device")
    .eq("enabled", true)
    .eq("ad_slots.slot_key", slotKey)
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const row = data as { code?: string | null } | null;
  if (!row?.code) return null;
  return { slotKey, code: row.code };
}

export async function getSitemapRecords() {
  const [gameSlugs, categorySlugs, tagSlugs, pageSlugs] = await Promise.all([
    getAllPublishedGameSlugs(),
    getAllCategorySlugs(),
    getAllTagSlugs(),
    getAllStaticPageSlugs(),
  ]);
  return [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/arama", priority: "0.7", changefreq: "weekly" },
    ...gameSlugs.map((slug) => ({ path: `/oyun/${slug}`, priority: "0.8", changefreq: "weekly" })),
    ...categorySlugs.map((slug) => ({ path: `/kategori/${slug}`, priority: "0.7", changefreq: "weekly" })),
    ...tagSlugs.map((slug) => ({ path: `/etiket/${slug}`, priority: "0.5", changefreq: "monthly" })),
    ...pageSlugs.map((slug) => ({ path: `/sayfa/${slug}`, priority: "0.4", changefreq: "monthly" })),
  ];
}

export async function getCategoryPageParams(perPage: number) {
  const slugs = await getAllCategorySlugs();
  const params: Array<{ slug: string; pageNumber: string }> = [];
  for (const slug of slugs) {
    const page = await getCategoryPage(slug, 1, perPage);
    for (let index = 2; page && index <= Math.ceil(page.total / perPage); index += 1) {
      params.push({ slug, pageNumber: String(index) });
    }
  }
  if (params.length === 0 && slugs[0]) return [{ slug: slugs[0], pageNumber: "2" }];
  return params;
}

export async function getTagPageParams(perPage: number) {
  const slugs = await getAllTagSlugs();
  const params: Array<{ slug: string; pageNumber: string }> = [];
  for (const slug of slugs) {
    const page = await getTagPage(slug, 1, perPage);
    for (let index = 2; page && index <= Math.ceil(page.total / perPage); index += 1) {
      params.push({ slug, pageNumber: String(index) });
    }
  }
  if (params.length === 0 && slugs[0]) return [{ slug: slugs[0], pageNumber: "2" }];
  return params;
}

async function getHomepageSections() {
  const supabase = getStaticClient();
  if (!supabase) return [] as HomepageSectionRow[];
  const { data } = await supabase
    .from("homepage_sections")
    .select("id,title,section_type,source_type,source_id,manual_game_ids,limit_count,sort_order,visibility,status")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  return (data ?? []) as HomepageSectionRow[];
}

async function resolveHomepageSection(section: HomepageSectionRow, sharedGames: Game[]) {
  const limit = Math.min(Math.max(section.limit_count ?? 12, 1), 60);
  let games = sharedGames.slice(0, limit);
  if (section.section_type === "manual_games" && Array.isArray(section.manual_game_ids)) {
    games = await getPublishedGamesByIds(section.manual_game_ids.filter((id): id is string => typeof id === "string"));
  } else if (section.section_type === "popular_games") {
    games = [...sharedGames].sort((a, b) => b.playCount - a.playCount).slice(0, limit);
  } else if (section.section_type === "trending_games") {
    games = [...sharedGames].sort((a, b) => (b.likesCount + b.playCount / 20) - (a.likesCount + a.playCount / 20)).slice(0, limit);
  } else if (section.section_type === "random_picks") {
    games = stableShuffle(sharedGames, section.id).slice(0, limit);
  } else if (section.section_type === "category_based" && section.source_id) {
    const category = await getTaxonomyById("categories", section.source_id);
    const page = category ? await getCategoryPage(category.slug, 1, limit) : null;
    games = page?.items ?? [];
  } else if (section.section_type === "tag_based" && section.source_id) {
    const tag = await getTaxonomyById("tags", section.source_id);
    const page = tag ? await getTagPage(tag.slug, 1, limit) : null;
    games = page?.items ?? [];
  }
  return { id: section.id, title: section.title, visibility: section.visibility ?? "all", games: games.slice(0, limit) };
}

async function getTaxonomyById(table: "categories" | "tags", id: string) {
  const supabase = getStaticClient();
  if (!supabase) return null;
  const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  return data ? mapTaxonomy(data) : null;
}

async function getGameCategories(gameId: string) {
  const supabase = getStaticClient();
  if (!supabase) return [];
  const { data } = await supabase.from("game_categories").select("categories(id,name,slug,description,seo_title,seo_description,og_image_url,is_indexable)").eq("game_id", gameId);
  return (data ?? []).flatMap((row: { categories?: unknown }) => row.categories ? [mapTaxonomy(Array.isArray(row.categories) ? row.categories[0] : row.categories)] : []);
}

async function getGameTags(gameId: string) {
  const supabase = getStaticClient();
  if (!supabase) return [];
  const { data } = await supabase.from("game_tags").select("tags(id,name,slug,description,seo_title,seo_description,og_image_url,is_indexable)").eq("game_id", gameId);
  return (data ?? []).flatMap((row: { tags?: unknown }) => row.tags ? [mapTaxonomy(Array.isArray(row.tags) ? row.tags[0] : row.tags)] : []);
}

async function getApprovedComments(gameId: string): Promise<PublicComment[]> {
  const supabase = getStaticClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("comments")
    .select("id, body, likes_count, created_at, profiles(username, first_name, last_name, display_name)")
    .eq("game_id", gameId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((comment: {
    id: string;
    body: string;
    likes_count: number | null;
    created_at: string | null;
    profiles?: { username?: string | null; first_name?: string | null; last_name?: string | null; display_name?: string | null } | Array<{ username?: string | null; first_name?: string | null; last_name?: string | null; display_name?: string | null }> | null;
  }) => {
    const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
    const username = profile?.username || "Oyuncu";
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    return {
      id: comment.id,
      body: comment.body,
      username,
      displayName: fullName || profile?.display_name || username,
      createdAt: comment.created_at ?? new Date().toISOString(),
      likesCount: comment.likes_count ?? 0,
    };
  });
}

async function getTags(): Promise<TaxonomyLink[]> {
  const supabase = getStaticClient();
  if (!supabase) {
    const uniqueTags = new Map<string, TaxonomyLink>();
    for (const game of fallbackGames) {
      for (const tag of game.tags) {
        const slug = slugify(tag);
        uniqueTags.set(slug, {
          id: slug,
          name: tag,
          slug,
          description: null,
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          isIndexable: true,
          publishedGameCount: fallbackGames.filter((item) => item.tags.includes(tag)).length,
        });
      }
    }
    return [...uniqueTags.values()];
  }
  const { data } = await supabase.from("tags").select("*").eq("status", "active").order("name");
  const tags = ((data ?? []) as Array<Record<string, unknown>>).map(mapTaxonomy);
  const counts = await getTagCounts(tags.map((tag) => tag.id));
  return tags.map((tag) => ({
    ...tag,
    publishedGameCount: counts.get(tag.id) ?? 0,
    isIndexable: isTagIndexable({
      requested: tag.isIndexable ?? false,
      publishedGameCount: counts.get(tag.id) ?? 0,
      seoTitle: tag.seoTitle,
      seoDescription: tag.seoDescription,
    }),
  }));
}

async function getTagCounts(tagIds: string[]) {
  const supabase = getStaticClient();
  const counts = new Map<string, number>();
  if (!supabase || tagIds.length === 0) return counts;
  for (let index = 0; index < tagIds.length; index += 500) {
    const { data } = await supabase
      .from("game_tags")
      .select("tag_id, games!inner(id)")
      .in("tag_id", tagIds.slice(index, index + 500))
      .eq("games.status", "published");
    for (const row of (data ?? []) as Array<{ tag_id: string }>) counts.set(row.tag_id, (counts.get(row.tag_id) ?? 0) + 1);
  }
  return counts;
}

async function getPublishedGamesByIds(ids: string[]) {
  const supabase = getStaticClient();
  if (!supabase || ids.length === 0) return [];
  const { data } = await supabase.from("games").select(gameSelect).eq("status", "published").eq("is_broken", false).in("id", ids);
  const byId = new Map(((data ?? []) as GameRow[]).map((row) => [row.id, mapGameRow(row)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  apply: (query: QueryBuilder<T>) => PromiseLike<QueryResult<T>>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const query = apply(supabase.from(table).select(columns).range(from, from + 999) as unknown as QueryBuilder<T>);
    const { data, error } = await query;
    if (error || !data) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

type QueryResult<T> = {
  data: T[] | null;
  error: unknown;
};

type QueryBuilder<T> = PromiseLike<QueryResult<T>> & {
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
};

function mapGameRow(row: GameRow): Game {
  const shortDescription = row.short_description ?? "";
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription,
    longDescription: row.long_description ?? shortDescription,
    howToPlay: row.how_to_play ?? shortDescription,
    controls: Array.isArray(row.controls) ? row.controls : [],
    features: Array.isArray(row.features) ? row.features : [],
    developer: row.developer ?? "",
    thumbnailUrl: row.thumbnail_url ?? "/thumbnails/space.svg",
    gameType: row.game_type,
    embedUrl: row.embed_url ?? undefined,
    swfUrl: row.swf_url ?? undefined,
    html5Url: row.html5_url ?? undefined,
    externalUrl: row.external_url ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    sourceDomain: row.source_domain ?? undefined,
    status: row.status,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: row.rating_count ?? 0,
    likesCount: row.likes_count ?? 0,
    dislikesCount: row.dislikes_count ?? 0,
    playCount: row.play_count ?? 0,
    categories: [],
    tags: [],
    seoTitle: row.seo_title ?? `${row.title} Oyna`,
    seoDescription: row.seo_description ?? shortDescription,
    primaryCategoryId: row.primary_category_id ?? undefined,
    ogImageUrl: row.og_image_url ?? undefined,
    isIndexable: row.is_indexable ?? row.status === "published",
    isBroken: row.is_broken ?? false,
  };
}

function mapTaxonomy(row: unknown): TaxonomyLink {
  const value = row as Record<string, unknown>;
  return {
    id: String(value.id ?? ""),
    name: String(value.name ?? ""),
    slug: String(value.slug ?? ""),
    description: typeof value.description === "string" ? value.description : null,
    seoTitle: typeof value.seo_title === "string" ? value.seo_title : null,
    seoDescription: typeof value.seo_description === "string" ? value.seo_description : null,
    ogImageUrl: typeof value.og_image_url === "string" ? value.og_image_url : null,
    isIndexable: typeof value.is_indexable === "boolean" ? value.is_indexable : true,
  };
}

function prioritizeTaxonomy(items: TaxonomyLink[], primaryCategoryId?: string) {
  if (!primaryCategoryId) return items;
  return [...items].sort((a, b) => Number(b.id === primaryCategoryId) - Number(a.id === primaryCategoryId));
}

function stableShuffle(games: Game[], seed: string) {
  return [...games].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`));
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result;
}

function parseStaticContent(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as { sections?: Array<{ heading: string; paragraphs: string[] }> };
    if (Array.isArray(parsed.sections)) return parsed.sections;
  } catch {
    return [{ heading: "İçerik", paragraphs: [value] }];
  }
  return [{ heading: "İçerik", paragraphs: [value] }];
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "10 Temmuz 2026";
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const fallbackStaticPages = [
  {
    title: "Kullanım Şartları",
    slug: "kullanim-sartlari",
    description: "Bol Oyun kullanım şartları.",
    seoTitle: "Kullanım Şartları",
    seoDescription: "Bol Oyun kullanım şartları.",
    ogImageUrl: null,
    isIndexable: true,
    updatedAt: "10 Temmuz 2026",
    sections: [{ heading: "Kullanım", paragraphs: ["Bol Oyun, tarayıcı oyunlarını keşfetmek ve oynamak için hazırlanmış bir oyun portalıdır."] }],
  },
  {
    title: "Gizlilik Politikası",
    slug: "gizlilik-politikasi",
    description: "Bol Oyun gizlilik politikası.",
    seoTitle: "Gizlilik Politikası",
    seoDescription: "Bol Oyun gizlilik politikası.",
    ogImageUrl: null,
    isIndexable: true,
    updatedAt: "10 Temmuz 2026",
    sections: [{ heading: "Gizlilik", paragraphs: ["Kullanıcı verileri yalnızca site özelliklerini çalıştırmak ve güvenliği sağlamak için işlenir."] }],
  },
  {
    title: "Çerez Politikası",
    slug: "cerez-politikasi",
    description: "Bol Oyun çerez politikası.",
    seoTitle: "Çerez Politikası",
    seoDescription: "Bol Oyun çerez politikası.",
    ogImageUrl: null,
    isIndexable: true,
    updatedAt: "10 Temmuz 2026",
    sections: [{ heading: "Çerezler", paragraphs: ["Çerezler oturum, güvenlik ve tercihleri hatırlamak için kullanılabilir."] }],
  },
  {
    title: "İletişim",
    slug: "iletisim",
    description: "Bol Oyun iletişim bilgileri.",
    seoTitle: "İletişim",
    seoDescription: "Bol Oyun iletişim bilgileri.",
    ogImageUrl: null,
    isIndexable: true,
    updatedAt: "10 Temmuz 2026",
    sections: [{ heading: "İletişim", paragraphs: ["Bol Oyun ile iletişim kurmak için admin panelinde yapılandırılan iletişim kanallarını kullanabilirsin."] }],
  },
];

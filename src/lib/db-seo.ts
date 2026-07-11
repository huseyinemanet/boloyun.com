import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { isTagIndexable } from "@/lib/seo/audit";

export type SitemapRecord = {
  path: string;
  updatedAt: string | null;
  kind: "game" | "category" | "tag" | "static";
};

type SlugRow = {
  id?: string;
  slug: string;
  updated_at: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_indexable?: boolean | null;
  is_broken?: boolean | null;
};

export async function getSitemapRecords(): Promise<SitemapRecord[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const [games, categories, tags, staticPages] = await Promise.all([
    fetchGames(),
    fetchCategories(),
    fetchIndexableTags(),
    fetchStaticPages(),
  ]);

  return [
    ...games.map((row) => record("game", `/oyun/${row.slug}`, row.updated_at)),
    ...categories.map((row) => record("category", `/kategori/${row.slug}`, row.updated_at)),
    ...tags.map((row) => record("tag", `/etiket/${row.slug}`, row.updated_at)),
    ...staticPages.map((row) => record("static", `/sayfa/${row.slug}`, row.updated_at)),
  ];
}

async function fetchGames() {
  const modern = await fetchAll("games", "slug, updated_at, is_indexable, is_broken", { status: "published", indexable: true, excludeBroken: true });
  if (!modern.error) return modern.rows;
  const legacy = await fetchAll("games", "slug, updated_at", { status: "published" });
  return legacy.rows;
}

async function fetchCategories() {
  const modern = await fetchAll("categories", "slug, updated_at, is_indexable", { status: "active", indexable: true });
  if (!modern.error) return modern.rows;
  const legacy = await fetchAll("categories", "slug, updated_at", { status: "active" });
  return legacy.rows;
}

async function fetchIndexableTags() {
  const result = await fetchAll("tags", "id, slug, updated_at, seo_title, seo_description, is_indexable", { status: "active", indexable: true });
  if (result.error) return [] as SlugRow[];
  const counts = await countPublishedTagGames(result.rows.flatMap((tag) => tag.id ? [tag.id] : []));
  const checked = result.rows.map((tag) => {
    if (!tag.id) return null;
    return isTagIndexable({
      requested: tag.is_indexable ?? false,
      publishedGameCount: counts.get(tag.id) ?? 0,
      seoTitle: tag.seo_title,
      seoDescription: tag.seo_description,
    }) ? tag : null;
  });
  return checked.filter((tag): tag is SlugRow => Boolean(tag));
}

async function fetchStaticPages() {
  const modern = await fetchAll("static_pages", "slug, updated_at, is_indexable", { status: "published", indexable: true });
  if (!modern.error) return modern.rows;
  const legacy = await fetchAll("static_pages", "slug, updated_at", { status: "published" });
  return legacy.rows;
}

async function fetchAll(
  table: "games" | "categories" | "tags" | "static_pages",
  columns: string,
  filters: { status: string; indexable?: boolean; excludeBroken?: boolean },
) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { rows: [] as SlugRow[], error: "Supabase yok" };
  const rows: SlugRow[] = [];
  for (let from = 0; ; from += 1000) {
    let request = supabase
      .from(table)
      .select(columns)
      .eq("status", filters.status)
      .order("updated_at", { ascending: false })
      .order("slug", { ascending: true })
      .range(from, from + 999);
    if (filters.indexable !== undefined) request = request.eq("is_indexable", filters.indexable);
    if (filters.excludeBroken) request = request.eq("is_broken", false);
    const { data, error } = await request;
    if (error) return { rows: [] as SlugRow[], error: error.message || "Sorgu başarısız" };
    const page = (data ?? []) as unknown as SlugRow[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return { rows, error: null as string | null };
}

async function countPublishedTagGames(tagIds: string[]) {
  const supabase = createSupabaseServiceClient();
  const counts = new Map<string, number>();
  if (!supabase || tagIds.length === 0) return counts;
  for (let index = 0; index < tagIds.length; index += 500) {
    const { data, error } = await supabase
      .from("game_tags")
      .select("tag_id, game_id, games!inner(id)")
      .in("tag_id", tagIds.slice(index, index + 500))
      .eq("games.status", "published");
    if (error) continue;
    for (const row of data ?? []) counts.set(row.tag_id, (counts.get(row.tag_id) ?? 0) + 1);
  }
  return counts;
}

function record(kind: SitemapRecord["kind"], path: string, updatedAt: string | null): SitemapRecord {
  return { kind, path, updatedAt };
}

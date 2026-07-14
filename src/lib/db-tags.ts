import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { getPublishedGamesByIds, mapGameRow, type GameRow } from "@/lib/db-games";
import { isTagIndexable } from "@/lib/seo/audit";
import { slugify } from "@/lib/slug/slugify";

export type TagRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url?: string | null;
  is_indexable?: boolean | null;
  updated_at?: string | null;
};

export type PublicTag = TagRow & {
  publishedGameCount: number;
  effectiveIndexable: boolean;
};

type TagLinkRow = { game_id: string; tag_id?: string };

type PublicTagPageRpc = {
  tag?: (TagRow & { published_game_count?: number | string | null }) | null;
  games?: GameRow[];
  total?: number | string | null;
};

const getPublicTagBySlugCached = unstable_cache(async function getPublicTagBySlug(slug: string): Promise<PublicTag | null> {
  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) return null;

    const { data, error } = await supabase.from("tags").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
    if (error || !data) return null;

    const publishedGameCount = await getPublishedGameCountForTag(data.id as string);
    const tag = data as TagRow;
    return {
      ...tag,
      publishedGameCount,
      effectiveIndexable: isTagIndexable({
        requested: tag.is_indexable ?? false,
        publishedGameCount,
        seoTitle: tag.seo_title,
        seoDescription: tag.seo_description,
      }),
    };
  } catch (error) {
    console.error("[tags] public tag could not be read", { slug, ...toLogError(error) });
    return null;
  }
}, ["public-tag-by-slug"], { revalidate: 600, tags: ["tags"] });
export const getPublicTagBySlug = cache(getPublicTagBySlugCached);

export async function getPublishedGamesByTagSlugPage({
  slug,
  page,
  perPage,
}: {
  slug: string;
  page: number;
  perPage: number;
}) {
  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { items: [], total: 0 };

    const from = (page - 1) * perPage;
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_public_tag_page", {
      p_slug: slug,
      p_limit: perPage,
      p_offset: from,
    });

    if (!rpcError && rpcData && typeof rpcData === "object") {
      const result = rpcData as PublicTagPageRpc;
      return {
        items: Array.isArray(result.games) ? result.games.map(mapGameRow) : [],
        total: Number(result.total ?? 0),
      };
    }

    const { data: tag } = await supabase.from("tags").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
    if (!tag) return { items: [], total: 0 };

    const to = from + perPage - 1;
    const { data, error, count } = await supabase
      .from("game_tags")
      .select("game_id, games!inner(id)", { count: "exact" })
      .eq("tag_id", tag.id)
      .eq("games.status", "published")
      .range(from, to);

    if (error || !data) return { items: [], total: 0 };
    const ids = (data as unknown as TagLinkRow[]).map((row) => row.game_id);
    return { items: await getPublishedGamesByIds(ids), total: count ?? 0 };
  } catch (error) {
    console.error("[tags] published tag games could not be read", { slug, page, perPage, ...toLogError(error) });
    return { items: [], total: 0 };
  }
}

export async function getAdminTagsPage({ page, perPage, query = "" }: { page: number; perPage: number; query?: string }) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { items: [] as PublicTag[], total: 0 };

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let request = supabase.from("tags").select("*", { count: "exact" }).order("name").range(from, to);
  if (query.trim()) request = request.ilike("name", `%${query.trim().replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  const { data, error, count } = await request;
  if (error || !data) return { items: [] as PublicTag[], total: 0 };

  const tags = data as TagRow[];
  const { data: countRows, error: countError } = await supabase.rpc("get_tag_published_counts", { p_tag_ids: tags.map((tag) => tag.id) });
  if (countError) throw new Error(`Etiket oyun sayıları okunamadı: ${countError.message}`);
  const counts = new Map(((countRows ?? []) as Array<{ tag_id: string; published_count: number }>).map((row) => [row.tag_id, Number(row.published_count)]));
  const items = tags.map((tag) => {
    const publishedGameCount = counts.get(tag.id) ?? 0;
    return {
      ...tag,
      publishedGameCount,
      effectiveIndexable: isTagIndexable({
        requested: tag.is_indexable ?? false,
        publishedGameCount,
        seoTitle: tag.seo_title,
        seoDescription: tag.seo_description,
      }),
    };
  });
  return { items, total: count ?? 0 };
}

export async function getAdminTagById(id: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("tags").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const tag = data as TagRow;
  const publishedGameCount = await getPublishedGameCountForTag(tag.id);
  return { ...tag, publishedGameCount };
}

export async function saveAdminTag(formData: FormData) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || slugify(name);
  if (!name || !slug) throw new Error("Etiket adı ve slug gerekli.");

  const payload = {
    name,
    slug,
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? "active"),
    seo_title: String(formData.get("seo_title") ?? ""),
    seo_description: String(formData.get("seo_description") ?? ""),
    og_image_url: String(formData.get("og_image_url") ?? "") || null,
    is_indexable: formData.get("is_indexable") === "on",
    updated_at: new Date().toISOString(),
  };
  const request = id ? supabase.from("tags").update(payload).eq("id", id) : supabase.from("tags").insert(payload);
  const { error } = await request;
  if (error) throw new Error(`Etiket kaydedilemedi: ${error.message}`);
}

async function getPublishedGameCountForTag(tagId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("game_tags")
    .select("game_id, games!inner(id)", { count: "exact", head: true })
    .eq("tag_id", tagId)
    .eq("games.status", "published");
  if (error) return 0;
  return count ?? 0;
}

function toLogError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

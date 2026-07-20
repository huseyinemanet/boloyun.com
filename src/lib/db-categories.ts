import { cache } from "react";
import { unstable_cache } from "next/cache";
import { mergePrebuildSlugs, PUBLIC_PREBUILD_LIMITS } from "@/lib/prebuild-policy";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { categories as fallbackCategories } from "@/lib/data";
import { slugify } from "@/lib/slug/slugify";
import { findNormalizedImportCategory } from "@/import/taxonomy/category-normalizer";
import { sanitizeSvgInput } from "@/lib/sanitize/html";
import type { Category } from "@/types/game";
import { getPublicShellSnapshot, type PublicNavCategory } from "@/lib/db-public-shell";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_svg: string | null;
  icon_url: string | null;
  status: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url?: string | null;
  is_indexable?: boolean | null;
  sort_order?: number | null;
  show_in_sidebar?: boolean | null;
  sidebar_sort_order?: number | null;
};

export async function getAdminCategories(): Promise<CategoryRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return fallbackCategories.map((category: Category, index) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon_svg: null,
      icon_url: null,
      status: "active",
      seo_title: category.name,
      seo_description: category.description,
      sidebar_sort_order: index,
    }));
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sidebar_sort_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  if (error || !data) return [];
  return data as CategoryRow[];
}

export async function getCategoriesCount(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return fallbackCategories.length;

  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Kategori sayisi okunamadi: ${error.message}`);
  }

  return count ?? 0;
}

const publicCategorySelect = "id,name,slug,description,icon_svg,icon_url,status,seo_title,seo_description,og_image_url,is_indexable,sort_order,show_in_sidebar,sidebar_sort_order";

const getPublicCategoriesCached = unstable_cache(async function getPublicCategories(limit?: number): Promise<CategoryRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return fallbackCategories.map((category: Category, index) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon_svg: null,
      icon_url: null,
      status: "active",
      seo_title: category.name,
      seo_description: category.description,
      sidebar_sort_order: index,
    }));
  }

  let query = supabase
    .from("categories")
    .select(publicCategorySelect)
    .eq("status", "active")
    .order("sidebar_sort_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    query = query.limit(Math.floor(limit));
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return normalizePublicCategoryRows(data as CategoryRow[]);
}, ["public-categories-v2"], { revalidate: 3600, tags: ["categories"] });
export const getPublicCategories = cache(getPublicCategoriesCached);

export async function getPrebuildCategorySlugs(): Promise<Array<{ slug: string }>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return mergePrebuildSlugs([fallbackCategories], PUBLIC_PREBUILD_LIMITS.categories);
  }
  const { data, error } = await supabase
    .from("categories")
    .select("slug")
    .eq("status", "active")
    .order("sidebar_sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(PUBLIC_PREBUILD_LIMITS.categories);
  return error || !data ? [] : mergePrebuildSlugs([data], PUBLIC_PREBUILD_LIMITS.categories);
}

const getSidebarCategoriesCached = unstable_cache(async function getSidebarCategoriesCached(): Promise<PublicNavCategory[]> {
  const snapshot = await getPublicShellSnapshot();
  if (snapshot) return snapshot.categories;

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return fallbackCategories.map((category, index) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon_svg: null,
      icon_url: null,
      sidebar_sort_order: index,
    }));
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,icon_svg,icon_url,sidebar_sort_order")
    .eq("status", "active")
    .eq("show_in_sidebar", true)
    .order("sidebar_sort_order", { ascending: true })
    .order("name", { ascending: true });

  return error || !data ? [] : data as PublicNavCategory[];
}, ["public-sidebar-categories-v2"], { revalidate: 3600, tags: ["categories", "public-shell"] });

export const getSidebarCategories = cache(getSidebarCategoriesCached);

const getPublicCategoryBySlugCached = unstable_cache(async function getPublicCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    const category = fallbackCategories.find((item) => item.slug === slug);
    return category
      ? {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon_svg: null,
          icon_url: null,
          status: "active",
          seo_title: category.name,
          seo_description: category.description,
        }
      : null;
  }

  const { data, error } = await supabase
    .from("categories")
    .select(publicCategorySelect)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return normalizePublicCategoryRow(data as CategoryRow);
}, ["public-category-by-slug-v2"], { revalidate: 3600, tags: ["categories"] });
export const getPublicCategoryBySlug = cache(getPublicCategoryBySlugCached);

export async function upsertAdminCategory(formData: FormData) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || slugify(name);

  if (!name || !slug) {
    throw new Error("Kategori adı ve slug gerekli.");
  }

  const payload: Record<string, string | boolean | number> = {
    name,
    slug,
    description: String(formData.get("description") ?? ""),
    icon_type: "custom",
    icon_svg: sanitizeSvgInput(String(formData.get("icon_svg") ?? "")),
    icon_url: String(formData.get("icon_url") ?? ""),
    status: String(formData.get("status") ?? "active"),
    seo_title: String(formData.get("seo_title") ?? ""),
    seo_description: String(formData.get("seo_description") ?? ""),
    og_image_url: String(formData.get("og_image_url") ?? ""),
    is_indexable: formData.get("is_indexable") === "on",
    updated_at: new Date().toISOString(),
  };

  if (!id) {
    const { data: lastCategory, error: orderError } = await supabase
      .from("categories")
      .select("sidebar_sort_order")
      .order("sidebar_sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderError) throw new Error(`Kategori sırası okunamadı: ${orderError.message}`);
    payload.sidebar_sort_order = Number(lastCategory?.sidebar_sort_order ?? -1) + 1;
  }

  const query = id
    ? supabase.from("categories").update(payload).eq("id", id)
    : supabase.from("categories").insert(payload);

  const { error } = await query;
  if (error) throw new Error(`Kategori kaydedilemedi: ${error.message}`);
}

export async function reorderAdminCategories(categoryIds: string[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { error } = await supabase.rpc("reorder_categories", { category_ids: categoryIds });
  if (error) throw new Error(`Kategori sırası kaydedilemedi: ${error.message}`);
}

export async function setAdminCategorySidebarVisibility(categoryId: string, visible: boolean) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { data, error } = await supabase.rpc("set_category_sidebar_visibility", {
    target_category_id: categoryId,
    target_visible: visible,
  });

  if (error) throw new Error(`Kategori menü ayarı kaydedilemedi: ${error.message}`);
  if (typeof data !== "string" || !data) throw new Error("Kategori bulunamadı.");
  return data;
}

function normalizePublicCategoryRows(rows: CategoryRow[]) {
  const seen = new Set<string>();
  const normalizedRows: CategoryRow[] = [];

  for (const row of rows) {
    const normalized = normalizePublicCategoryRow(row);
    if (seen.has(normalized.slug)) continue;
    seen.add(normalized.slug);
    normalizedRows.push(normalized);
  }

  return normalizedRows;
}

export function normalizePublicCategoryRow(row: CategoryRow): CategoryRow {
  const normalized = findNormalizedImportCategory(row.slug) ?? findNormalizedImportCategory(row.name);
  if (!normalized) return row;

  return {
    ...row,
    name: normalized.name,
    slug: normalized.slug,
    seo_title: row.seo_title || normalized.name,
  };
}

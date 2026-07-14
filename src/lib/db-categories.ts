import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { categories as fallbackCategories } from "@/lib/data";
import { slugify } from "@/lib/slug/slugify";
import { findNormalizedImportCategory } from "@/import/taxonomy/category-normalizer";
import { sanitizeSvgInput } from "@/lib/sanitize/html";
import type { Category } from "@/types/game";

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
};

const turkishCategoryCollator = new Intl.Collator("tr-TR", {
  sensitivity: "base",
  numeric: true,
});

export async function getAdminCategories(): Promise<CategoryRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return sortCategoriesByName(fallbackCategories.map((category: Category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon_svg: null,
      icon_url: null,
      status: "active",
      seo_title: category.name,
      seo_description: category.description,
    })));
  }

  const { data, error } = await supabase.from("categories").select("*").order("name", { ascending: true });
  if (error || !data) return [];
  return sortCategoriesByName(data as CategoryRow[]);
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

const getPublicCategoriesCached = unstable_cache(async function getPublicCategories(limit = 120): Promise<CategoryRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return sortCategoriesByName(fallbackCategories.map((category: Category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon_svg: null,
      icon_url: null,
      status: "active",
      seo_title: category.name,
      seo_description: category.description,
    })));
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return sortCategoriesByName(normalizePublicCategoryRows(data as CategoryRow[]));
}, ["public-categories"], { revalidate: 600, tags: ["categories"] });
export const getPublicCategories = cache(getPublicCategoriesCached);

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
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return normalizePublicCategoryRow(data as CategoryRow);
}, ["public-category-by-slug"], { revalidate: 600, tags: ["categories"] });
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

  const payload = {
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

  const query = id
    ? supabase.from("categories").update(payload).eq("id", id)
    : supabase.from("categories").insert(payload);

  const { error } = await query;
  if (error) throw new Error(`Kategori kaydedilemedi: ${error.message}`);
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

function sortCategoriesByName(rows: CategoryRow[]) {
  return [...rows].sort((left, right) => turkishCategoryCollator.compare(left.name, right.name));
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

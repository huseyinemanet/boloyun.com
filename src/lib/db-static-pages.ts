import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { unstable_cache } from "next/cache";
import { parseStaticPageEditorContent } from "@/lib/static-page-editor-content";

export type StaticPageSection = {
  heading: string;
  paragraphs: string[];
};

export type StaticPageDocument = {
  updatedAt: string;
  sections: StaticPageSection[];
};

export type StaticPageRow = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  content_json?: StaticPageDocument | null;
  seo_title: string | null;
  seo_description: string | null;
  status: string;
  og_image_url?: string | null;
  is_indexable?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const getPublishedStaticPageCached = unstable_cache(async function getPublishedStaticPage(slug: string): Promise<StaticPageRow | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("static_pages").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error || !data) return null;
  return normalizeStaticPage(data as StaticPageRow);
}, ["published-static-page"], { revalidate: 3600, tags: ["static-pages"] });

export const getPublishedStaticPage = getPublishedStaticPageCached;

export async function getAdminStaticPages() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [] as StaticPageRow[];
  const { data, error } = await supabase.from("static_pages").select("*").order("title");
  if (error || !data) return [] as StaticPageRow[];
  return (data as StaticPageRow[]).map(normalizeStaticPage);
}

export async function getAdminStaticPage(id: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("static_pages").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return normalizeStaticPage(data as StaticPageRow);
}

export async function saveAdminStaticPage(formData: FormData) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!title) throw new Error("Sayfa başlığı gerekli.");
  if (!slug) throw new Error("Sayfa slug alanı gerekli.");
  const sections = parseStaticPageEditorContent(String(formData.get("content") ?? ""));
  const document: StaticPageDocument = {
    updatedAt: new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
    sections,
  };
  const values = {
    title,
    slug,
    content: JSON.stringify(document),
    content_json: document,
    seo_title: String(formData.get("seo_title") ?? "").trim(),
    seo_description: String(formData.get("seo_description") ?? "").trim(),
    status: String(formData.get("status") ?? "published"),
    og_image_url: String(formData.get("og_image_url") ?? "").trim() || null,
    is_indexable: formData.get("is_indexable") === "on",
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from("static_pages").update(values).eq("id", id)
    : supabase.from("static_pages").insert(values);
  const { error } = await query;
  if (error) throw new Error(`Sayfa kaydedilemedi: ${error.message}`);
}

export async function deleteAdminStaticPage(id: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { error } = await supabase.from("static_pages").delete().eq("id", id);
  if (error) throw new Error(`Sayfa silinemedi: ${error.message}`);
}

export function staticPageEditorContent(page: StaticPageRow) {
  const document = readStaticPageDocument(page);
  return document.sections.map((section) => [section.heading, ...section.paragraphs].join("\n")).join("\n\n---\n\n");
}

export function readStaticPageDocument(page: Pick<StaticPageRow, "content" | "content_json" | "updated_at">): StaticPageDocument {
  if (page.content_json && Array.isArray(page.content_json.sections)) return page.content_json;
  if (page.content) {
    try {
      const parsed = JSON.parse(page.content) as StaticPageDocument;
      if (Array.isArray(parsed.sections)) return parsed;
    } catch {
      return {
        updatedAt: formatDate(page.updated_at),
        sections: [{ heading: "İçerik", paragraphs: [page.content] }],
      };
    }
  }
  return { updatedAt: formatDate(page.updated_at), sections: [] };
}

function normalizeStaticPage(page: StaticPageRow): StaticPageRow {
  return { ...page, content_json: readStaticPageDocument(page) };
}

function formatDate(value?: string | null) {
  if (!value) return "10 Temmuz 2026";
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

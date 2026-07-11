import { slugify } from "@/lib/slug/slugify";
import { getPublishableImports, getRequiredSupabaseServiceClient, updateImportStatus } from "@/import/db/game-imports";
import type { ScrapedGameImport } from "@/import/db/game-imports";
import { normalizeImportCategories, type NormalizedCategory } from "@/import/taxonomy/category-normalizer";
import { auditGameSeo } from "@/lib/seo/audit";
import { getPublicSettings } from "@/lib/db-settings";
import { isGameSourceAllowed } from "@/lib/settings/game-security";
import { mirrorGameCover } from "@/import/covers/mirror-cover";
import { deleteCoverObject } from "@/import/covers/r2-cover-store";

export async function approveImports(limit: number) {
  const imports = await getPublishableImports(limit);
  const results = [];

  for (const item of imports) {
    try {
      results.push(await approveImportRecord(item));
    } catch (error) {
      results.push({
        sourceUrl: item.source_url,
        status: "failed",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    }
  }

  return results;
}

export async function approveImportRecord(item: ScrapedGameImport) {
  const supabase = getRequiredSupabaseServiceClient();
  const title = item.ai_title_tr || item.original_title;
  if (!title) {
    throw new Error("Baslik yok");
  }

  const slug = await getUniqueGameSlug(slugify(title), item.source_url);
  const categories = normalizeImportCategories(item.ai_categories_tr || item.original_categories || [], 6);
  const categoryIds: string[] = [];
  for (const category of categories) categoryIds.push(await upsertCategory(category));
  const tags = uniqueClean(item.ai_tags_tr || item.original_tags || []).slice(0, 12);
  if (!item.thumbnail_url) {
    await updateImportStatus(item.id, "needs_fix");
    throw new Error("Oyun yayınlanmadan önce bir kapak görseli gerekli.");
  }
  let mirroredCover;
  try {
    mirroredCover = await mirrorGameCover(item.thumbnail_url);
  } catch (error) {
    await updateImportStatus(item.id, "needs_fix");
    throw new Error(`Kapak CDN'e aktarılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }
  const payload = {
    title,
    slug,
    short_description: item.ai_short_description_tr || item.original_description || `${title} oyununu hemen başlat ve oyna.`,
    long_description: item.ai_long_description_tr || item.original_description || item.original_how_to_play || "",
    how_to_play: item.ai_how_to_play_tr || item.original_how_to_play || "",
    controls: item.ai_controls_tr || item.original_controls || [],
    features: item.ai_features_tr || ["Tarayıcıda oynanır", "Oyunu Başlat butonu ile yüklenir"],
    developer: item.ai_developer_tr || item.original_developer || "",
    thumbnail_url: mirroredCover.publicUrl,
    thumbnail_source_url: item.thumbnail_url,
    thumbnail_r2_key: mirroredCover.r2Key,
    thumbnail_sync_status: "synced",
    thumbnail_sync_error: null,
    thumbnail_synced_at: new Date().toISOString(),
    game_type: item.detected_game_type || "external",
    embed_url: item.detected_embed_url,
    swf_url: item.detected_swf_url,
    html5_url: item.detected_html5_url,
    external_url: item.detected_external_url || item.source_url,
    source_url: item.source_url,
    source_domain: item.source_domain,
    status: "published",
    seo_title: item.ai_seo_title_tr || `${title} Oyna`,
    seo_description: item.ai_seo_description_tr || item.original_description || `${title} oyununu hemen oyna.`,
    primary_category_id: categoryIds[0] ?? null,
    og_image_url: null,
    is_indexable: true,
    is_broken: false,
    updated_at: new Date().toISOString(),
  };
  const { security } = await getPublicSettings();
  const gameSource = payload.game_type === "iframe" ? payload.embed_url : payload.game_type === "html5" ? payload.html5_url : payload.game_type === "swf" ? payload.swf_url : payload.external_url;
  if (!isGameSourceAllowed(gameSource, security)) {
    await updateImportStatus(item.id, "needs_fix");
    throw new Error("Oyun kaynağı iframe domain izin listesinde değil.");
  }

  const audit = auditGameSeo({
    title: payload.title,
    slug: payload.slug,
    seoTitle: payload.seo_title,
    seoDescription: payload.seo_description,
    thumbnailUrl: payload.thumbnail_url ?? "",
    shortDescription: payload.short_description,
    howToPlay: payload.how_to_play,
    controls: Array.isArray(payload.controls) ? payload.controls : [],
    primaryCategoryId: payload.primary_category_id,
    tags,
    gameType: payload.game_type,
    embedUrl: payload.embed_url,
    swfUrl: payload.swf_url,
    html5Url: payload.html5_url,
    externalUrl: payload.external_url,
  });
  if (!audit.publishable || containsUnreviewedPlaceholder(payload.long_description)) {
    await updateImportStatus(item.id, "needs_fix");
    const errors = [...audit.criticalErrors, ...(containsUnreviewedPlaceholder(payload.long_description) ? ["AI içeriği editör incelemesi bekliyor"] : [])];
    throw new Error(`Oyun yayınlanamaz. Eksikler: ${errors.join(", ")}`);
  }

  const { data, error } = await supabase.rpc("publish_game_import_atomic", {
    p_import_id: item.id,
    p_game: payload,
    p_category_ids: categoryIds,
    p_tags: tags.map((name) => ({ name, slug: slugify(name) })).filter((tag) => tag.slug),
  });
  const game = (Array.isArray(data) ? data[0] : data) as { id: string; slug: string } | null;
  if (error || !game) {
    await deleteCoverObject(mirroredCover.r2Key).catch((cleanupError) => {
      console.error("Orphaned cover cleanup failed", { key: mirroredCover.r2Key, error: cleanupError instanceof Error ? cleanupError.message : "unknown" });
    });
    throw new Error(error?.message ?? "Oyun yayınlama işlemi tamamlanamadı.");
  }
  return { sourceUrl: item.source_url, status: "published", slug: game.slug, title };
}

async function getUniqueGameSlug(baseSlug: string, sourceUrl: string) {
  const supabase = getRequiredSupabaseServiceClient();
  const { data: existingBySource } = await supabase
    .from("games")
    .select("slug")
    .eq("source_url", sourceUrl)
    .maybeSingle();

  if (existingBySource?.slug) {
    return existingBySource.slug as string;
  }

  let candidate = baseSlug || "oyun";
  let suffix = 2;

  while (true) {
    const { data } = await supabase.from("games").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function upsertCategory(category: NormalizedCategory) {
  const supabase = getRequiredSupabaseServiceClient();
  const { data, error } = await supabase
    .from("categories")
    .upsert({
      name: category.name,
      slug: category.slug,
      description: `${category.name} kategorisindeki ücretsiz tarayıcı oyunlarını keşfet ve hemen oyna.`,
      status: "active",
      seo_title: `${category.name} Oyna - Ücretsiz ${category.name}`,
      seo_description: `En sevilen ${category.name} oyunlarını ücretsiz oyna. Yeni, popüler ve klasik oyunları tarayıcıdan hemen başlat.`,
      updated_at: new Date().toISOString(),
    }, { onConflict: "slug" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

function uniqueClean(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length >= 2))];
}

function containsUnreviewedPlaceholder(value: string) {
  return value.toLocaleLowerCase("tr-TR").includes("ai içerik üretimi bekleniyor");
}

import "server-only";

import { generateGameContent } from "@/import/ai/generate-game-content";
import { getImportById, getRequiredSupabaseServiceClient, markImportFailed, markImportPendingReview, markImportScraped, type GameImportStatus, type ScrapedGameImport } from "@/import/db/game-imports";
import type { ParsedGame } from "@/import/parsers/types";
import { approveImportRecord } from "@/import/publish/approve-imports";
import { scrapeGame } from "@/import/scrape/scrape-game";
import type { GameType } from "@/types/game";
import { invalidatePublicContent } from "@/lib/public-cache-invalidation";
import { parseImportUrl, requiredImportReason, type ImportIntent } from "@/import/admin/import-validation";

export { parseImportIntent, type ImportIntent } from "@/import/admin/import-validation";

export async function runImportWorkflow(id: string, intent: ImportIntent, formData: FormData) {
  const item = await getImportById(id);
  if (item.import_status === "approved" && intent !== "save") throw new Error("Onaylanmış import üzerinde bu işlem yapılamaz.");

  if (intent === "save") return { item: await saveEditableImport(item, formData, item.import_status), notice: "saved" };
  if (intent === "regenerate") return { item: await regenerateImport(item, expectedVersion(formData)), notice: "regenerated" };
  if (intent === "retry") return { item: await retryImport(item, expectedVersion(formData)), notice: "retried" };
  if (intent === "needs_fix") return { item: await changeStatus(item, "needs_fix", requiredImportReason(formData.get("reason")), expectedVersion(formData)), notice: "needs_fix" };
  if (intent === "reject") return { item: await changeStatus(item, "rejected", requiredImportReason(formData.get("reason")), expectedVersion(formData)), notice: "rejected" };
  if (intent === "reopen") return { item: await changeStatus(item, "pending_review", null, expectedVersion(formData)), notice: "reopened" };

  const saved = await saveEditableImport(item, formData, "pending_review");
  const result = await approveImportRecord(saved);
  invalidatePublicContent({ kind: "published-game", slug: result.slug });
  return { item: await getImportById(id), result, notice: "approved" };
}

async function saveEditableImport(item: ScrapedGameImport, formData: FormData, status: GameImportStatus) {
  if (item.import_status === "approved") throw new Error("Onaylanmış import salt okunurdur.");
  const input = parseEditableImport(formData);
  return updateWithVersion(item.id, expectedVersion(formData), {
    ...input,
    import_status: status,
    error_message: status === "pending_review" ? null : item.error_message,
  });
}

async function regenerateImport(item: ScrapedGameImport, expected: string) {
  if (["failed", "approved"].includes(item.import_status)) throw new Error("Bu kayıt için önce yeniden işleme adımını kullanın.");
  const generated = await generateGameContent(toParsedGame(item));
  return updateWithVersion(item.id, expected, {
    ai_title_tr: generated.title_tr,
    ai_short_description_tr: generated.short_description_tr,
    ai_long_description_tr: generated.long_description_tr,
    ai_how_to_play_tr: generated.how_to_play_tr,
    ai_controls_tr: generated.controls_tr,
    ai_features_tr: generated.features_tr,
    ai_developer_tr: generated.developer_tr,
    ai_seo_title_tr: generated.seo_title_tr,
    ai_seo_description_tr: generated.seo_description_tr,
    ai_categories_tr: generated.categories_tr,
    ai_tags_tr: generated.tags_tr,
    import_status: "pending_review",
    error_message: null,
  });
}

async function retryImport(item: ScrapedGameImport, expected: string) {
  if (item.import_status !== "failed") throw new Error("Yalnızca başarısız kayıtlar yeniden işlenebilir.");
  await updateWithVersion(item.id, expected, { import_status: "discovered", error_message: null });
  try {
    const parsed = await scrapeGame(item.source_url, "miniplay");
    await markImportScraped(item.id, parsed);
    const generated = await generateGameContent(parsed);
    await markImportPendingReview(item.id, parsed, generated);
    return getImportById(item.id);
  } catch (error) {
    await markImportFailed(item.id, error instanceof Error ? error.message : "Bilinmeyen hata");
    throw error;
  }
}

async function changeStatus(item: ScrapedGameImport, status: GameImportStatus, reason: string | null, expected: string) {
  if (status === "pending_review" && item.import_status !== "rejected") throw new Error("Yalnızca reddedilen kayıtlar yeniden açılabilir.");
  if (status === "needs_fix" && !["scraped", "ai_generated", "pending_review", "needs_fix"].includes(item.import_status)) throw new Error("Bu kayıt düzeltmeye gönderilemez.");
  if (status === "rejected" && item.import_status === "approved") throw new Error("Onaylanmış kayıt reddedilemez.");
  return updateWithVersion(item.id, expected, { import_status: status, error_message: reason });
}

async function updateWithVersion(id: string, expected: string, values: Record<string, unknown>) {
  const supabase = getRequiredSupabaseServiceClient();
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("game_imports")
    .update({ ...values, updated_at: updatedAt })
    .eq("id", id)
    .eq("updated_at", expected)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Import güncellenemedi: ${error.message}`);
  if (!data) throw new Error("Bu kayıt başka bir yönetici tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.");
  return data as ScrapedGameImport;
}

function parseEditableImport(formData: FormData) {
  const gameType = String(formData.get("detected_game_type") ?? "external") as GameType;
  if (!["iframe", "swf", "html5", "external"].includes(gameType)) throw new Error("Geçersiz oyun tipi.");
  return {
    ai_title_tr: text(formData, "ai_title_tr", 180),
    ai_short_description_tr: text(formData, "ai_short_description_tr", 600),
    ai_long_description_tr: text(formData, "ai_long_description_tr", 20_000),
    ai_how_to_play_tr: text(formData, "ai_how_to_play_tr", 10_000),
    ai_controls_tr: lines(formData, "ai_controls_tr", 30),
    ai_features_tr: lines(formData, "ai_features_tr", 30),
    ai_developer_tr: text(formData, "ai_developer_tr", 180),
    ai_seo_title_tr: text(formData, "ai_seo_title_tr", 180),
    ai_seo_description_tr: text(formData, "ai_seo_description_tr", 600),
    ai_categories_tr: splitList(formData, "ai_categories_tr", 8),
    ai_tags_tr: splitList(formData, "ai_tags_tr", 16),
    thumbnail_url: parseImportUrl(formData.get("thumbnail_url"), "Kapak URL"),
    detected_game_type: gameType,
    detected_embed_url: parseImportUrl(formData.get("detected_embed_url"), "Embed URL", true),
    detected_swf_url: parseImportUrl(formData.get("detected_swf_url"), "SWF URL", true),
    detected_html5_url: parseImportUrl(formData.get("detected_html5_url"), "HTML5 URL", true),
    detected_external_url: parseImportUrl(formData.get("detected_external_url"), "Dış bağlantı", true),
  };
}

function toParsedGame(item: ScrapedGameImport): ParsedGame {
  if (!item.original_title) throw new Error("AI üretimi için orijinal başlık bulunamadı.");
  return {
    sourceUrl: item.source_url,
    sourceDomain: item.source_domain ?? new URL(item.source_url).hostname,
    originalTitle: item.original_title,
    originalDescription: item.original_description ?? "",
    originalHowToPlay: item.original_how_to_play ?? undefined,
    originalControls: item.original_controls ?? [],
    originalDeveloper: item.original_developer ?? undefined,
    originalCategories: item.original_categories ?? [],
    originalTags: item.original_tags ?? [],
    thumbnailUrl: item.thumbnail_url ?? undefined,
    detectedGameType: item.detected_game_type ?? "external",
    detectedEmbedUrl: item.detected_embed_url ?? undefined,
    detectedSwfUrl: item.detected_swf_url ?? undefined,
    detectedHtml5Url: item.detected_html5_url ?? undefined,
    detectedExternalUrl: item.detected_external_url ?? undefined,
  };
}

function expectedVersion(formData: FormData) {
  const value = String(formData.get("updated_at") ?? "");
  if (!value || Number.isNaN(Date.parse(value))) throw new Error("Kayıt sürümü eksik. Sayfayı yenileyin.");
  return value;
}

function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

function lines(formData: FormData, name: string, maxItems: number) {
  return String(formData.get(name) ?? "").split("\n").map((value) => value.trim()).filter(Boolean).slice(0, maxItems);
}

function splitList(formData: FormData, name: string, maxItems: number) {
  return [...new Set(String(formData.get(name) ?? "").split(/[\n,]/).map((value) => value.trim()).filter(Boolean))].slice(0, maxItems);
}

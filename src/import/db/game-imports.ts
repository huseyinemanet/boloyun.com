import type { ParsedGame } from "@/import/parsers/types";
import type { GeneratedGameContent } from "@/import/ai/generate-game-content";
import type { DiscoveredGameUrl } from "@/import/sitemap/discover";
import { normalizeImportCategories } from "@/import/taxonomy/category-normalizer";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { keysetFilter, type KeysetCursor, type KeysetDirection } from "@/lib/keyset-pagination";

export type GameImportStatus =
  | "discovered"
  | "scraped"
  | "ai_generated"
  | "pending_review"
  | "approved"
  | "rejected"
  | "failed"
  | "duplicate"
  | "needs_fix";

export type GameImportQueueItem = {
  id: string;
  source_url: string;
  source_domain: string | null;
  import_status: GameImportStatus;
};

export type ScrapedGameImport = {
  id: string;
  updated_at: string;
  source_url: string;
  source_domain: string | null;
  import_status: GameImportStatus;
  original_title: string | null;
  original_description: string | null;
  original_how_to_play: string | null;
  original_controls: string[] | null;
  original_developer: string | null;
  original_categories: string[] | null;
  original_tags: string[] | null;
  thumbnail_url: string | null;
  detected_game_type: "iframe" | "swf" | "html5" | "external" | null;
  detected_embed_url: string | null;
  detected_swf_url: string | null;
  detected_html5_url: string | null;
  detected_external_url: string | null;
  ai_title_tr: string | null;
  ai_short_description_tr: string | null;
  ai_long_description_tr: string | null;
  ai_how_to_play_tr: string | null;
  ai_controls_tr: string[] | null;
  ai_features_tr: string[] | null;
  ai_developer_tr: string | null;
  ai_seo_title_tr: string | null;
  ai_seo_description_tr: string | null;
  ai_categories_tr: string[] | null;
  ai_tags_tr: string[] | null;
};

export type InsertNewImportsProgress = {
  phase: "duplicates" | "insert";
  checked?: number;
  total?: number;
  inserted?: number;
  skipped?: number;
};

export function getRequiredSupabaseServiceClient() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client yok. .env.local icinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  }
  return supabase;
}

export async function insertDiscoveredImports(items: DiscoveredGameUrl[]) {
  const supabase = getRequiredSupabaseServiceClient();
  let processed = 0;

  for (const chunk of chunkArray(items, WRITE_CHUNK_SIZE)) {
    const rows = chunk.map((item) => ({
      source_url: item.sourceUrl,
      source_domain: item.sourceDomain,
      import_status: "discovered" as const,
    }));

    const { error } = await supabase
      .from("game_imports")
      .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });

    if (error) {
      throw new Error(`Discovered kayitlari yazilamadi: ${error.message}`);
    }

    processed += rows.length;
  }

  return { processed };
}

export async function insertNewDiscoveredImports(
  items: DiscoveredGameUrl[],
  onProgress?: (progress: InsertNewImportsProgress) => void | Promise<void>,
) {
  const supabase = getRequiredSupabaseServiceClient();
  const existing = await getExistingSourceUrls(items.map((item) => item.sourceUrl), async (progress) => {
    await onProgress?.({ phase: "duplicates", ...progress });
  });
  const newItems = items.filter((item) => !existing.has(item.sourceUrl));
  const inserted: GameImportQueueItem[] = [];
  await onProgress?.({ phase: "insert", total: newItems.length, inserted: 0, skipped: items.length - newItems.length });

  for (const chunk of chunkArray(newItems, WRITE_CHUNK_SIZE)) {
    const rows = chunk.map((item) => ({
      source_url: item.sourceUrl,
      source_domain: item.sourceDomain,
      import_status: "discovered" as const,
    }));

    const { data, error } = await supabase
      .from("game_imports")
      .insert(rows)
      .select("id, source_url, source_domain, import_status");

    if (error) {
      throw new Error(`Yeni oyun URL'leri yazilamadi: ${error.message}`);
    }

    inserted.push(...((data ?? []) as GameImportQueueItem[]));
    await onProgress?.({
      phase: "insert",
      total: newItems.length,
      inserted: inserted.length,
      skipped: items.length - newItems.length,
    });
  }

  return {
    discovered: items.length,
    inserted,
    insertedCount: inserted.length,
    skippedCount: items.length - newItems.length,
  };
}

export async function getDiscoveredImports(limit: number) {
  return getImportsByStatus("discovered", limit);
}

export async function getDiscoveredImportsBySourceUrls(
  sourceUrls: string[],
  limit: number,
  onProgress?: (progress: { checked: number; total: number; found: number }) => void | Promise<void>,
) {
  const supabase = getRequiredSupabaseServiceClient();
  const imports: GameImportQueueItem[] = [];
  let checked = 0;

  if (sourceUrls.length === 0 || limit <= 0) {
    await onProgress?.({ checked: 0, total: sourceUrls.length, found: 0 });
    return imports;
  }

  for (const chunk of chunkArray(sourceUrls, DUPLICATE_LOOKUP_CHUNK_SIZE)) {
    if (imports.length >= limit) break;

    const { data, error } = await supabase
      .from("game_imports")
      .select("id, source_url, source_domain, import_status")
      .eq("import_status", "discovered")
      .in("source_url", chunk)
      .limit(limit - imports.length);

    if (error) {
      throw new Error(`Discovered scrape hedefleri okunamadi: ${formatSupabaseError(error)}`);
    }

    imports.push(...((data ?? []) as GameImportQueueItem[]));
    checked += chunk.length;
    await onProgress?.({ checked, total: sourceUrls.length, found: imports.length });
  }

  return imports;
}

export async function getImportsByStatus(status: GameImportStatus, limit: number) {
  const supabase = getRequiredSupabaseServiceClient();
  const { data, error } = await supabase
    .from("game_imports")
    .select("id, source_url, source_domain, import_status")
    .eq("import_status", status)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`${status} queue okunamadi: ${error.message}`);
  }

  return (data ?? []) as GameImportQueueItem[];
}

export async function markImportScraped(id: string, parsed: ParsedGame) {
  const supabase = getRequiredSupabaseServiceClient();
  const { error } = await supabase
    .from("game_imports")
    .update({
      source_domain: parsed.sourceDomain,
      original_title: parsed.originalTitle,
      original_description: parsed.originalDescription,
      original_how_to_play: parsed.originalHowToPlay,
      original_controls: parsed.originalControls,
      original_developer: parsed.originalDeveloper,
      original_categories: normalizeImportCategories(parsed.originalCategories, 8).map((category) => category.name),
      original_tags: parsed.originalTags,
      thumbnail_url: parsed.thumbnailUrl,
      detected_game_type: parsed.detectedGameType,
      detected_embed_url: parsed.detectedEmbedUrl,
      detected_swf_url: parsed.detectedSwfUrl,
      detected_html5_url: parsed.detectedHtml5Url,
      detected_external_url: parsed.detectedExternalUrl,
      import_status: "scraped",
      error_message: null,
      raw_html_snapshot: parsed.rawHtmlSnapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Scraped kaydi guncellenemedi: ${error.message}`);
  }
}

export async function markImportPendingReview(id: string, parsed: ParsedGame, generated: GeneratedGameContent) {
  const supabase = getRequiredSupabaseServiceClient();
  const { error } = await supabase
    .from("game_imports")
    .update({
      source_domain: parsed.sourceDomain,
      original_title: parsed.originalTitle,
      original_description: parsed.originalDescription,
      original_how_to_play: parsed.originalHowToPlay,
      original_controls: parsed.originalControls,
      original_developer: parsed.originalDeveloper,
      original_categories: normalizeImportCategories(parsed.originalCategories, 8).map((category) => category.name),
      original_tags: parsed.originalTags,
      thumbnail_url: parsed.thumbnailUrl,
      detected_game_type: parsed.detectedGameType,
      detected_embed_url: parsed.detectedEmbedUrl,
      detected_swf_url: parsed.detectedSwfUrl,
      detected_html5_url: parsed.detectedHtml5Url,
      detected_external_url: parsed.detectedExternalUrl,
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
      raw_html_snapshot: parsed.rawHtmlSnapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`AI hazir import kaydi guncellenemedi: ${error.message}`);
  }
}

export async function markImportFailed(id: string, message: string) {
  const supabase = getRequiredSupabaseServiceClient();
  const { error } = await supabase
    .from("game_imports")
    .update({
      import_status: "failed",
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed kaydi guncellenemedi: ${error.message}`);
  }
}

export async function retryFailedImports(limit: number) {
  const supabase = getRequiredSupabaseServiceClient();
  const { data, error } = await supabase
    .from("game_imports")
    .update({
      import_status: "discovered",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("import_status", "failed")
    .select("id")
    .limit(limit);

  if (error) {
    throw new Error(`Failed kayitlari retry kuyruguna alinamadi: ${error.message}`);
  }

  return { count: data?.length ?? 0 };
}

export async function getPublishableImports(limit: number) {
  const supabase = getRequiredSupabaseServiceClient();
  const { data, error } = await supabase
    .from("game_imports")
    .select("*")
    .in("import_status", ["scraped", "pending_review", "ai_generated"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Publishable import kayitlari okunamadi: ${error.message}`);
  }

  return (data ?? []) as ScrapedGameImport[];
}

export async function markImportApproved(id: string, publishedGameId: string) {
  const supabase = getRequiredSupabaseServiceClient();
  const { error } = await supabase.from("game_imports").update({ import_status: "approved", published_game_id: publishedGameId, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Import onay kaydi guncellenemedi: ${error.message}`);
}

export async function updateImportStatus(id: string, status: GameImportStatus) {
  const supabase = getRequiredSupabaseServiceClient();
  const { error } = await supabase
    .from("game_imports")
    .update({
      import_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Import status guncellenemedi: ${error.message}`);
  }
}

export async function getImportById(id: string) {
  const supabase = getRequiredSupabaseServiceClient();
  const { data, error } = await supabase
    .from("game_imports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Import kaydi okunamadi: ${error.message}`);
  }

  return data as ScrapedGameImport;
}

export async function getAdminImports(limit: number) {
  const supabase = getRequiredSupabaseServiceClient();
  const { data, error } = await supabase
    .from("game_imports")
    .select("*")
    .in("import_status", ["scraped", "ai_generated", "pending_review", "needs_fix", "failed"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Admin import kayitlari okunamadi: ${error.message}`);
  }

  return (data ?? []) as ScrapedGameImport[];
}

export async function getAdminImportStats() {
  const supabase = getRequiredSupabaseServiceClient();
  const [pendingResult, failedResult, totalResult] = await Promise.all([
    supabase
      .from("game_imports")
      .select("id", { count: "exact", head: true })
      .in("import_status", ["scraped", "ai_generated", "pending_review"]),
    supabase
      .from("game_imports")
      .select("id", { count: "exact", head: true })
      .eq("import_status", "failed"),
    supabase
      .from("game_imports")
      .select("id", { count: "exact", head: true }),
  ]);

  if (pendingResult.error) {
    throw new Error(`Onay bekleyen import sayisi okunamadi: ${pendingResult.error.message}`);
  }

  if (failedResult.error) {
    throw new Error(`Failed import sayisi okunamadi: ${failedResult.error.message}`);
  }

  if (totalResult.error) {
    throw new Error(`Toplam import sayisi okunamadi: ${totalResult.error.message}`);
  }

  return {
    pending: pendingResult.count ?? 0,
    failed: failedResult.count ?? 0,
    total: totalResult.count ?? 0,
  };
}

export async function getAdminImportsPage({ cursor, direction, perPage }: {
  cursor: KeysetCursor | null;
  direction: KeysetDirection;
  perPage: number;
}) {
  const supabase = getRequiredSupabaseServiceClient();
  const ascending = direction === "previous";
  let query = supabase
    .from("game_imports")
    .select("*")
    .in("import_status", ["scraped", "ai_generated", "pending_review", "needs_fix", "failed"])
    .order("updated_at", { ascending })
    .order("id", { ascending })
    .limit(perPage + 1);
  if (cursor) query = query.or(keysetFilter(cursor, direction));
  const { data, error } = await query;

  if (error) {
    throw new Error(`Admin import kayitlari okunamadi: ${error.message}`);
  }

  const hasMore = (data?.length ?? 0) > perPage;
  const items = ((data ?? []).slice(0, perPage) as ScrapedGameImport[]);
  if (ascending) items.reverse();
  return {
    items,
    previousCursor: items.length > 0 && (direction === "next" ? cursor !== null : hasMore)
      ? { updatedAt: items[0].updated_at, id: items[0].id }
      : null,
    nextCursor: items.length > 0 && (direction === "previous" ? true : hasMore)
      ? { updatedAt: items[items.length - 1].updated_at, id: items[items.length - 1].id }
      : null,
  };
}

const WRITE_CHUNK_SIZE = 500;
const DUPLICATE_LOOKUP_CHUNK_SIZE = 25;

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function getExistingSourceUrls(
  sourceUrls: string[],
  onProgress?: (progress: { checked: number; total: number }) => void | Promise<void>,
) {
  const supabase = getRequiredSupabaseServiceClient();
  const existing = new Set<string>();
  let checked = 0;

  if (sourceUrls.length === 0) {
    await onProgress?.({ checked: 0, total: 0 });
    return existing;
  }

  for (const chunk of chunkArray(sourceUrls, DUPLICATE_LOOKUP_CHUNK_SIZE)) {
    const [{ data: imports, error: importsError }, { data: games, error: gamesError }] = await Promise.all([
      supabase.from("game_imports").select("source_url").in("source_url", chunk),
      supabase.from("games").select("source_url").in("source_url", chunk),
    ]);

    if (importsError) {
      throw new Error(`Import duplicate kontrolu yapilamadi: ${formatSupabaseError(importsError)}`);
    }

    if (gamesError) {
      throw new Error(`Games duplicate kontrolu yapilamadi: ${formatSupabaseError(gamesError)}`);
    }

    for (const item of imports ?? []) {
      if (item.source_url) existing.add(item.source_url);
    }

    for (const item of games ?? []) {
      if (item.source_url) existing.add(item.source_url);
    }

    checked += chunk.length;
    await onProgress?.({ checked, total: sourceUrls.length });
  }

  return existing;
}

function formatSupabaseError(error: { message: string; code?: string; details?: string | null; hint?: string | null }) {
  return [error.message, error.code, error.details, error.hint].filter(Boolean).join(" | ");
}

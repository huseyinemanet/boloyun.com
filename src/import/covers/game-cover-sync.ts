import { getRequiredSupabaseServiceClient } from "@/import/db/game-imports";
import { isCdnCoverUrl, mirrorGameCover } from "./mirror-cover";
import { assertCoverR2Configured } from "./r2-cover-store";
import { safeExternalFetch } from "@/import/security/safe-fetch";

export type CoverSyncStatus = "pending" | "syncing" | "synced" | "failed" | "rolled_back";

type CoverRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  thumbnail_source_url: string | null;
  thumbnail_r2_key: string | null;
  thumbnail_sync_status: CoverSyncStatus;
};

export async function syncGameCovers(options: { limit: number; concurrency: number; retryFailed?: boolean }) {
  assertCoverR2Configured();
  await recoverInterruptedSyncs();
  const statuses: CoverSyncStatus[] = options.retryFailed ? ["failed"] : ["pending", "rolled_back"];
  const rows = await getCoverRows(statuses, options.limit);
  const results = await concurrentMap(rows, options.concurrency, syncCoverRow);
  return summarize(results);
}

export async function auditGameCovers(options: { limit?: number; concurrency: number }) {
  assertCoverR2Configured();
  const rows = await getAllCoverRows(["synced"], options.limit ?? 100_000);
  const results = await concurrentMap(rows, options.concurrency, async (row) => {
    if (!row.thumbnail_url || !row.thumbnail_r2_key || !isCdnCoverUrl(row.thumbnail_url)) {
      return { id: row.id, status: "invalid" as const, error: "CDN URL veya R2 anahtarı eksik." };
    }
    try {
      const response = await safeExternalFetch(row.thumbnail_url, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) throw new Error(`Geçersiz içerik türü: ${contentType || "yok"}`);
      return { id: row.id, status: "valid" as const };
    } catch (error) {
      return { id: row.id, status: "invalid" as const, error: message(error) };
    }
  });
  return {
    checked: results.length,
    valid: results.filter((item) => item.status === "valid").length,
    invalid: results.filter((item) => item.status === "invalid").length,
    errors: results.filter((item) => item.status === "invalid").slice(0, 100),
  };
}

export async function rollbackGameCovers(limit: number) {
  const supabase = getRequiredSupabaseServiceClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, thumbnail_source_url")
    .eq("thumbnail_sync_status", "synced")
    .not("thumbnail_source_url", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  let rolledBack = 0;
  for (const row of data ?? []) {
    const { error: updateError } = await supabase.from("games").update({
      thumbnail_url: row.thumbnail_source_url,
      thumbnail_sync_status: "rolled_back",
      thumbnail_sync_error: null,
      thumbnail_synced_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id).eq("thumbnail_sync_status", "synced");
    if (updateError) throw new Error(updateError.message);
    rolledBack += 1;
  }
  return { requested: limit, rolledBack };
}

async function syncCoverRow(row: CoverRow) {
  const supabase = getRequiredSupabaseServiceClient();
  const sourceUrl = row.thumbnail_source_url || row.thumbnail_url;
  if (!sourceUrl) return fail(row.id, "Kaynak kapak URL'si yok.");

  const { data: claimed, error: claimError } = await supabase.from("games").update({
    thumbnail_source_url: sourceUrl,
    thumbnail_sync_status: "syncing",
    thumbnail_sync_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id).eq("thumbnail_sync_status", row.thumbnail_sync_status).select("id").maybeSingle();
  if (claimError) return { id: row.id, status: "failed" as const, error: claimError.message };
  if (!claimed) return { id: row.id, status: "skipped" as const };

  try {
    const mirrored = await mirrorGameCover(sourceUrl);
    const now = new Date().toISOString();
    const { error } = await supabase.from("games").update({
      thumbnail_url: mirrored.publicUrl,
      thumbnail_source_url: sourceUrl,
      thumbnail_r2_key: mirrored.r2Key,
      thumbnail_sync_status: "synced",
      thumbnail_sync_error: null,
      thumbnail_synced_at: now,
      updated_at: now,
    }).eq("id", row.id).eq("thumbnail_sync_status", "syncing");
    if (error) throw error;
    return { id: row.id, status: "synced" as const, bytes: mirrored.byteSize };
  } catch (error) {
    return fail(row.id, message(error));
  }
}

async function fail(id: string, errorMessage: string) {
  const supabase = getRequiredSupabaseServiceClient();
  const error = errorMessage.slice(0, 1_000);
  await supabase.from("games").update({
    thumbnail_sync_status: "failed",
    thumbnail_sync_error: error,
  }).eq("id", id);
  return { id, status: "failed" as const, error };
}

async function getCoverRows(statuses: CoverSyncStatus[], limit: number): Promise<CoverRow[]> {
  const { data, error } = await getRequiredSupabaseServiceClient()
    .from("games")
    .select("id, title, thumbnail_url, thumbnail_source_url, thumbnail_r2_key, thumbnail_sync_status")
    .in("thumbnail_sync_status", statuses)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as CoverRow[];
}

async function getAllCoverRows(statuses: CoverSyncStatus[], limit: number) {
  const rows: CoverRow[] = [];
  while (rows.length < limit) {
    const pageSize = Math.min(1_000, limit - rows.length);
    const { data, error } = await getRequiredSupabaseServiceClient()
      .from("games")
      .select("id, title, thumbnail_url, thumbnail_source_url, thumbnail_r2_key, thumbnail_sync_status")
      .in("thumbnail_sync_status", statuses)
      .order("updated_at", { ascending: true })
      .range(rows.length, rows.length + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as CoverRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function recoverInterruptedSyncs() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1_000).toISOString();
  const { error } = await getRequiredSupabaseServiceClient().from("games").update({
    thumbnail_sync_status: "failed",
    thumbnail_sync_error: "Önceki senkronizasyon yarıda kesildi; yeniden denenebilir.",
  }).eq("thumbnail_sync_status", "syncing").lt("updated_at", cutoff);
  if (error) throw new Error(error.message);
}

async function concurrentMap<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function summarize(results: Array<{ status: "synced" | "failed" | "skipped"; bytes?: number; error?: string }>) {
  return {
    processed: results.length,
    synced: results.filter((item) => item.status === "synced").length,
    failed: results.filter((item) => item.status === "failed").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    bytes: results.reduce((sum, item) => sum + (item.bytes ?? 0), 0),
    errors: results.filter((item) => item.status === "failed").slice(0, 100),
  };
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Bilinmeyen hata";
}

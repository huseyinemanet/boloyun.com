import { createHash } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { decryptApiKey, encryptApiKey, apiKeyFingerprint } from "./crypto";
import { testAiProvider, translateGameContent } from "./providers";
import {
  AI_PROVIDERS,
  DEFAULT_AI_MODELS,
  type AiTranslationItemStatus,
  type AiBatchSize,
  type AiProvider,
  type AiProviderConfig,
  type AiRuntimeConfig,
  type AiTranslationActivity,
  type AiTranslationJob,
  type AiTranslationStats,
  type GameTranslationInput,
  isAiProvider,
} from "./types";

type ProviderConfigRow = {
  provider: string;
  model: string;
  encrypted_api_key: string | null;
  key_fingerprint: string | null;
  enabled: boolean | null;
  last_test_status: "untested" | "success" | "failed" | null;
  last_test_error: string | null;
  last_test_at: string | null;
  updated_at: string | null;
};

type JobRow = {
  id: string;
  provider: string;
  model: string;
  batch_size: number;
  status: AiTranslationJob["status"];
  total_count: number | null;
  completed_count: number | null;
  failed_count: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CandidateRow = {
  id: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  how_to_play: string | null;
  controls: unknown;
  features: unknown;
  seo_title: string | null;
  seo_description: string | null;
  source_hash: string | null;
};

type GameRow = Omit<CandidateRow, "source_hash"> & {
  status: string | null;
};

type JobItemRow = {
  id: string;
  game_id: string;
  attempts: number | null;
};

type ActivityRow = JobItemRow & {
  job_id: string;
  status: AiTranslationActivity["status"];
  error_message: string | null;
  before_snapshot: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

const PROCESS_ITEMS_PER_CLICK = 5;
const STALE_PROCESSING_MINUTES = 1;

export async function getAiDashboardData() {
  const [configs, stats, jobs, activity] = await Promise.all([
    listProviderConfigs(),
    getTranslationStats(),
    listRecentJobs(),
    listRecentTranslationActivity(),
  ]);
  return { configs, stats, jobs, activity };
}

export async function listProviderConfigs(): Promise<AiProviderConfig[]> {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("provider, model, encrypted_api_key, key_fingerprint, enabled, last_test_status, last_test_error, last_test_at, updated_at")
    .order("provider", { ascending: true });
  if (error) throw new Error(`AI provider ayarları okunamadı: ${error.message}`);
  const rows = data as ProviderConfigRow[] | null;
  const byProvider = new Map((rows ?? []).map((row) => [row.provider, row]));
  return AI_PROVIDERS.map((provider) => mapProviderConfig(byProvider.get(provider) ?? {
    provider,
    model: DEFAULT_AI_MODELS[provider],
    encrypted_api_key: null,
    key_fingerprint: null,
    enabled: false,
    last_test_status: "untested",
    last_test_error: null,
    last_test_at: null,
    updated_at: null,
  }));
}

export async function saveProviderConfig(input: { provider: AiProvider; model: string; apiKey?: string; enabled: boolean }) {
  const supabase = requiredServiceClient();
  const existing = await getProviderConfigRow(input.provider);
  const model = input.model.trim() || DEFAULT_AI_MODELS[input.provider];
  const apiKey = input.apiKey?.trim() ?? "";
  if (input.enabled && !apiKey && !existing?.encrypted_api_key) throw new Error("Provider aktif edilecekse API key gerekli.");
  const encrypted = apiKey ? await encryptApiKey(apiKey) : existing?.encrypted_api_key ?? null;
  const fingerprint = apiKey ? await apiKeyFingerprint(apiKey) : existing?.key_fingerprint ?? null;
  const { error } = await supabase
    .from("ai_provider_configs")
    .upsert({
      provider: input.provider,
      model,
      encrypted_api_key: encrypted,
      key_fingerprint: fingerprint,
      enabled: input.enabled,
      last_test_status: apiKey || model !== existing?.model ? "untested" : existing?.last_test_status ?? "untested",
      last_test_error: apiKey || model !== existing?.model ? null : existing?.last_test_error ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider" });
  if (error) throw new Error(`AI provider ayarı kaydedilemedi: ${error.message}`);
}

export async function testProviderConfig(provider: AiProvider) {
  const config = await getRuntimeConfig(provider, { requireEnabled: false });
  const supabase = requiredServiceClient();
  try {
    await testAiProvider(config);
    await supabase.from("ai_provider_configs").update({
      last_test_status: "success",
      last_test_error: null,
      last_test_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("provider", provider);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen test hatası";
    await supabase.from("ai_provider_configs").update({
      last_test_status: "failed",
      last_test_error: message,
      last_test_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("provider", provider);
    throw new Error(message);
  }
}

export async function createTranslationJob(input: { provider: AiProvider; batchSize: AiBatchSize; createdBy: string; retryFailedOnly?: boolean }) {
  const config = await getRuntimeConfig(input.provider, { requireEnabled: true });
  const supabase = requiredServiceClient();
  const { data: candidatesData, error: candidatesError } = await supabase.rpc("get_ai_translation_candidates", {
    p_limit: input.batchSize,
    p_failed_only: Boolean(input.retryFailedOnly),
  });
  if (candidatesError) throw new Error(`Çeviri adayları okunamadı: ${candidatesError.message}`);
  const candidates = (candidatesData ?? []) as CandidateRow[];
  const { data: jobData, error: jobError } = await supabase
    .from("ai_translation_jobs")
    .insert({
      provider: input.provider,
      model: config.model,
      batch_size: input.batchSize,
      status: candidates.length ? "queued" : "completed",
      total_count: candidates.length,
      completed_count: 0,
      failed_count: 0,
      created_by: input.createdBy,
      completed_at: candidates.length ? null : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (jobError || !jobData) throw new Error(`Çeviri işi oluşturulamadı: ${jobError?.message ?? "kayıt yok"}`);
  const jobId = (jobData as { id: string }).id;
  if (candidates.length) {
    const { error: itemsError } = await supabase.from("ai_translation_job_items").insert(candidates.map((candidate) => ({
      job_id: jobId,
      game_id: candidate.id,
      before_snapshot: candidateSnapshot(candidate),
    })));
    if (itemsError) throw new Error(`Çeviri iş kalemleri oluşturulamadı: ${itemsError.message}`);
    await upsertPendingStates(candidates);
  }
  return jobId;
}

export async function processTranslationJob(jobId: string, options: { limit?: number } = {}) {
  const supabase = requiredServiceClient();
  logAi("job.process.start", { jobId });
  const job = await getJob(jobId);
  if (job.status === "paused" || job.status === "cancelled" || job.status === "completed") {
    logAi("job.process.skip", { jobId, status: job.status });
    return summarizeJob(jobId);
  }
  const config = await getRuntimeConfig(job.provider, { requireEnabled: true });
  await recoverStaleProcessingItems(jobId);
  await supabase.from("ai_translation_jobs").update({
    status: "running",
    started_at: job.startedAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);

  const { data: itemsData, error: itemsError } = await supabase
    .from("ai_translation_job_items")
    .select("id, game_id, attempts")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(job.batchSize, options.limit ?? PROCESS_ITEMS_PER_CLICK)));
  if (itemsError) throw new Error(`Çeviri iş kalemleri okunamadı: ${itemsError.message}`);
  const items = (itemsData ?? []) as JobItemRow[];
  logAi("job.process.items", { jobId, selected: items.length, batchSize: job.batchSize, perClickLimit: options.limit ?? PROCESS_ITEMS_PER_CLICK });

  for (const item of items) {
    await processTranslationItem(jobId, item, config);
    await refreshJobCounts(jobId);
    await sleep(250);
  }

  await refreshJobCounts(jobId);
  logAi("job.process.done", { jobId, processed: items.length });
  revalidateTag("games", "max");
  revalidatePath("/");
  return summarizeJob(jobId);
}

export async function pauseTranslationJob(jobId: string) {
  const supabase = requiredServiceClient();
  const { error } = await supabase.from("ai_translation_jobs").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", jobId).in("status", ["queued", "running"]);
  if (error) throw new Error(`Çeviri işi duraklatılamadı: ${error.message}`);
  const { data: processingItems, error: processingReadError } = await supabase
    .from("ai_translation_job_items")
    .select("game_id")
    .eq("job_id", jobId)
    .eq("status", "processing");
  if (processingReadError) throw new Error(`İşlenen çeviri kalemleri okunamadı: ${processingReadError.message}`);
  const { error: itemsError } = await supabase.from("ai_translation_job_items").update({
    status: "pending",
    error_message: "İş duraklatıldı; devam ettirildiğinde tekrar işlenecek.",
    updated_at: new Date().toISOString(),
  }).eq("job_id", jobId).eq("status", "processing");
  if (itemsError) throw new Error(`İşlenen çeviri kalemleri duraklatılamadı: ${itemsError.message}`);
  const gameIds = (processingItems ?? []).map((item) => (item as { game_id: string }).game_id);
  if (gameIds.length) {
    const { error: statesError } = await supabase.from("game_translation_state").update({
      status: "pending",
      last_error: "İş duraklatıldı; devam ettirildiğinde tekrar işlenecek.",
      updated_at: new Date().toISOString(),
    }).in("game_id", gameIds).eq("status", "processing");
    if (statesError) throw new Error(`Çeviri durumları duraklatılamadı: ${statesError.message}`);
  }
  await refreshJobCounts(jobId);
}

export async function resumeTranslationJob(jobId: string) {
  const supabase = requiredServiceClient();
  const { error } = await supabase.from("ai_translation_jobs").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", jobId).eq("status", "paused");
  if (error) throw new Error(`Çeviri işi devam ettirilemedi: ${error.message}`);
}

export async function getTranslationStats(): Promise<AiTranslationStats> {
  const supabase = requiredServiceClient();
  const [published, completed, failed, processing] = await Promise.all([
    countRows("games", { column: "status", value: "published" }),
    countRows("game_translation_state", { column: "status", value: "completed" }),
    countRows("game_translation_state", { column: "status", value: "failed" }),
    countRows("game_translation_state", { column: "status", value: "processing" }),
  ]);
  void supabase;
  return {
    totalPublished: published,
    completed,
    failed,
    processing,
    pending: Math.max(0, published - completed - failed - processing),
  };
}

export async function listRecentJobs(limit = 8): Promise<AiTranslationJob[]> {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("ai_translation_jobs")
    .select("id, provider, model, batch_size, status, total_count, completed_count, failed_count, started_at, completed_at, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Çeviri işleri okunamadı: ${error.message}`);
  return ((data ?? []) as JobRow[]).map(mapJob);
}

export async function listRecentTranslationActivity(limit = 20): Promise<AiTranslationActivity[]> {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("ai_translation_job_items")
    .select("id, job_id, game_id, status, attempts, error_message, before_snapshot, started_at, completed_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`AI işlem logları okunamadı: ${error.message}`);
  return ((data ?? []) as ActivityRow[]).map(mapActivity);
}

async function processTranslationItem(jobId: string, item: JobItemRow, config: AiRuntimeConfig) {
  const supabase = requiredServiceClient();
  const attempts = Number(item.attempts ?? 0) + 1;
  logAi("item.process.start", { jobId, itemId: item.id, gameId: item.game_id, attempts, provider: config.provider, model: config.model });
  await supabase.from("ai_translation_job_items").update({
    status: "processing",
    attempts,
    error_message: null,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", item.id);
  await supabase.from("game_translation_state").upsert({
    game_id: item.game_id,
    status: "processing",
    provider: config.provider,
    model: config.model,
    attempts,
    updated_at: new Date().toISOString(),
  });

  try {
    const game = await getPublishedGame(item.game_id);
    if (!game) throw new Error("Yayınlı oyun bulunamadı.");
    const input = mapGameInput(game);
    logAi("item.translate.request", {
      jobId,
      itemId: item.id,
      gameId: item.game_id,
      title: game.title,
      hasControls: input.controls.length > 0,
      hasFeatures: input.features.length > 0,
    });
    const output = await translateGameContent(input, config);
    const sourceHash = sourceHashForGame(game);
    const { error: gameError } = await supabase.from("games").update({
      short_description: output.short_description,
      long_description: output.long_description,
      how_to_play: output.how_to_play,
      controls: output.controls,
      features: output.features,
      seo_title: output.seo_title,
      seo_description: output.seo_description,
      updated_at: new Date().toISOString(),
    }).eq("id", item.game_id);
    if (gameError) throw new Error(`Oyun güncellenemedi: ${gameError.message}`);

    await supabase.from("game_translation_state").upsert({
      game_id: item.game_id,
      status: "completed",
      provider: config.provider,
      model: config.model,
      translated_at: new Date().toISOString(),
      source_hash: sourceHash,
      last_error: null,
      attempts,
      updated_at: new Date().toISOString(),
    });
    await supabase.from("ai_translation_job_items").update({
      status: "completed",
      output_snapshot: output,
      error_message: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);
    logAi("item.process.completed", { jobId, itemId: item.id, gameId: item.game_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen çeviri hatası";
    logAiError("item.process.failed", error, { jobId, itemId: item.id, gameId: item.game_id, attempts });
    await supabase.from("game_translation_state").upsert({
      game_id: item.game_id,
      status: "failed",
      provider: config.provider,
      model: config.model,
      last_error: message,
      attempts,
      updated_at: new Date().toISOString(),
    });
    await supabase.from("ai_translation_job_items").update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);
  }
}

async function getPublishedGame(id: string) {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, short_description, long_description, how_to_play, controls, features, seo_title, seo_description, status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Oyun okunamadı: ${error.message}`);
  return data as GameRow | null;
}

async function getRuntimeConfig(provider: AiProvider, options: { requireEnabled: boolean }): Promise<AiRuntimeConfig> {
  const row = await getProviderConfigRow(provider);
  if (!row) throw new Error(`${provider} ayarı bulunamadı.`);
  if (options.requireEnabled && !row.enabled) throw new Error(`${provider} aktif değil.`);
  if (!row.encrypted_api_key) throw new Error(`${provider} API key kaydı yok.`);
  return {
    provider,
    model: row.model || DEFAULT_AI_MODELS[provider],
    apiKey: await decryptApiKey(row.encrypted_api_key),
  };
}

async function getProviderConfigRow(provider: AiProvider) {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("provider, model, encrypted_api_key, key_fingerprint, enabled, last_test_status, last_test_error, last_test_at, updated_at")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(`AI provider ayarı okunamadı: ${error.message}`);
  return data as ProviderConfigRow | null;
}

async function getJob(jobId: string) {
  const supabase = requiredServiceClient();
  const { data, error } = await supabase
    .from("ai_translation_jobs")
    .select("id, provider, model, batch_size, status, total_count, completed_count, failed_count, started_at, completed_at, created_at, updated_at")
    .eq("id", jobId)
    .single();
  if (error || !data) throw new Error(`Çeviri işi okunamadı: ${error?.message ?? "kayıt yok"}`);
  return mapJob(data as JobRow);
}

async function refreshJobCounts(jobId: string) {
  const supabase = requiredServiceClient();
  const [job, completed, failed, pending, processing] = await Promise.all([
    getJob(jobId),
    countRows("ai_translation_job_items", { column: "job_id", value: jobId }, { column: "status", value: "completed" }),
    countRows("ai_translation_job_items", { column: "job_id", value: jobId }, { column: "status", value: "failed" }),
    countRows("ai_translation_job_items", { column: "job_id", value: jobId }, { column: "status", value: "pending" }),
    countRows("ai_translation_job_items", { column: "job_id", value: jobId }, { column: "status", value: "processing" }),
  ]);
  const status = job.status === "paused" || job.status === "cancelled"
    ? job.status
    : processing > 0
      ? "running"
      : pending > 0
        ? "queued"
        : "completed";
  const { error } = await supabase.from("ai_translation_jobs").update({
    completed_count: completed,
    failed_count: failed,
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);
  if (error) throw new Error(`Çeviri işi sayaçları güncellenemedi: ${error.message}`);
  logAi("job.counts.refreshed", { jobId, completed, failed, pending, processing, status });
}

async function summarizeJob(jobId: string) {
  await refreshJobCounts(jobId);
  return getJob(jobId);
}

async function recoverStaleProcessingItems(jobId: string) {
  const supabase = requiredServiceClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("ai_translation_job_items")
    .update({
      status: "pending",
      error_message: "Önceki işlem yarıda kaldı; tekrar sıraya alındı.",
      updated_at: new Date().toISOString(),
    })
    .eq("job_id", jobId)
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .select("id");
  if (error) throw new Error(`Yarım kalan çeviri kalemleri toparlanamadı: ${error.message}`);
  if (data?.length) logAi("job.processing.recovered", { jobId, count: data.length });
}

async function upsertPendingStates(candidates: CandidateRow[]) {
  const supabase = requiredServiceClient();
  const { error } = await supabase.from("game_translation_state").upsert(candidates.map((candidate) => ({
    game_id: candidate.id,
    status: "pending",
    source_hash: candidate.source_hash ?? candidateSnapshot(candidate).source_hash,
    last_error: null,
    updated_at: new Date().toISOString(),
  })));
  if (error) throw new Error(`Çeviri durumları hazırlanamadı: ${error.message}`);
}

async function countRows(table: "games" | "game_translation_state" | "ai_translation_job_items", ...filters: Array<{ column: string; value: string }>) {
  const supabase = requiredServiceClient();
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  for (const filter of filters) query = query.eq(filter.column, filter.value);
  const { count, error } = await query;
  if (error) throw new Error(`Sayaç okunamadı: ${error.message}`);
  return count ?? 0;
}

function mapProviderConfig(row: ProviderConfigRow): AiProviderConfig {
  const provider = isAiProvider(row.provider) ? row.provider : "deepseek";
  return {
    provider,
    model: row.model || DEFAULT_AI_MODELS[provider],
    enabled: Boolean(row.enabled),
    hasApiKey: Boolean(row.encrypted_api_key),
    keyFingerprint: row.key_fingerprint,
    lastTestStatus: row.last_test_status ?? "untested",
    lastTestError: row.last_test_error,
    lastTestAt: row.last_test_at,
    updatedAt: row.updated_at,
  };
}

function mapJob(row: JobRow): AiTranslationJob {
  return {
    id: row.id,
    provider: isAiProvider(row.provider) ? row.provider : "deepseek",
    model: row.model,
    batchSize: row.batch_size,
    status: row.status,
    totalCount: row.total_count ?? 0,
    completedCount: row.completed_count ?? 0,
    failedCount: row.failed_count ?? 0,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivity(row: ActivityRow): AiTranslationActivity {
  return {
    id: row.id,
    jobId: row.job_id,
    gameId: row.game_id,
    title: typeof row.before_snapshot?.title === "string" ? row.before_snapshot.title : row.game_id,
    status: isTranslationItemStatus(row.status) ? row.status : "failed",
    attempts: row.attempts ?? 0,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function isTranslationItemStatus(value: string): value is AiTranslationItemStatus {
  return ["pending", "processing", "completed", "failed", "skipped"].includes(value);
}

function candidateSnapshot(candidate: CandidateRow) {
  return {
    title: candidate.title,
    short_description: candidate.short_description ?? "",
    long_description: candidate.long_description ?? "",
    how_to_play: candidate.how_to_play ?? "",
    controls: normalizeArray(candidate.controls),
    features: normalizeArray(candidate.features),
    seo_title: candidate.seo_title ?? "",
    seo_description: candidate.seo_description ?? "",
    source_hash: candidate.source_hash ?? sourceHashForGame(candidate),
  };
}

function mapGameInput(game: GameRow): GameTranslationInput {
  return {
    title: game.title,
    short_description: game.short_description ?? "",
    long_description: game.long_description ?? game.short_description ?? "",
    how_to_play: game.how_to_play ?? "",
    controls: normalizeArray(game.controls),
    features: normalizeArray(game.features),
    seo_title: game.seo_title ?? `${game.title} Oyna`,
    seo_description: game.seo_description ?? game.short_description ?? "",
  };
}

function normalizeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function sourceHashForGame(game: Omit<CandidateRow, "source_hash">) {
  return createHash("md5").update([
    game.short_description ?? "",
    game.long_description ?? "",
    game.how_to_play ?? "",
    JSON.stringify(game.controls ?? []),
    JSON.stringify(game.features ?? []),
    game.seo_title ?? "",
    game.seo_description ?? "",
  ].join(String.fromCharCode(31))).digest("hex");
}

function requiredServiceClient() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  return supabase;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logAi(event: string, details: Record<string, unknown> = {}) {
  console.log(`[ai-translation] ${event}`, details);
}

function logAiError(event: string, error: unknown, details: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ai-translation] ${event}`, { ...details, error: message });
}

export const AI_PROVIDERS = ["deepseek"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_BATCH_SIZES = [25, 50, 100, 250, 500] as const;
export type AiBatchSize = (typeof AI_BATCH_SIZES)[number];

export const DEFAULT_AI_MODELS: Record<AiProvider, string> = {
  deepseek: "deepseek-v4-flash",
};

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  deepseek: "DeepSeek",
};

export type AiProviderConfig = {
  provider: AiProvider;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  keyFingerprint: string | null;
  lastTestStatus: "untested" | "success" | "failed";
  lastTestError: string | null;
  lastTestAt: string | null;
  updatedAt: string | null;
};

export type AiRuntimeConfig = {
  provider: AiProvider;
  model: string;
  apiKey: string;
};

export type GameTranslationInput = {
  title: string;
  short_description: string;
  long_description: string;
  how_to_play: string;
  controls: string[];
  features: string[];
  seo_title: string;
  seo_description: string;
};

export type TranslatedGameContent = {
  short_description: string;
  long_description: string;
  how_to_play: string;
  controls: string[];
  features: string[];
  seo_title: string;
  seo_description: string;
};

export type AiTranslationJobStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";
export type AiTranslationItemStatus = "pending" | "processing" | "completed" | "failed" | "skipped";

export type AiTranslationJob = {
  id: string;
  provider: AiProvider;
  model: string;
  batchSize: number;
  status: AiTranslationJobStatus;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiTranslationStats = {
  totalPublished: number;
  completed: number;
  failed: number;
  processing: number;
  pending: number;
};

export type AiTranslationAutomationStatus = "idle" | "running" | "disabled" | "error";

export type AiTranslationAutomation = {
  enabled: boolean;
  provider: AiProvider;
  dailyTarget: number;
  perRunLimit: number;
  retryFailed: boolean;
  status: AiTranslationAutomationStatus;
  currentJobId: string | null;
  todayCompleted: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type AiTranslationActivity = {
  id: string;
  jobId: string;
  gameId: string;
  title: string;
  slug: string | null;
  status: AiTranslationItemStatus;
  attempts: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export function parseBatchSize(value: string | number | null | undefined): AiBatchSize {
  const size = Number(value);
  return (AI_BATCH_SIZES as readonly number[]).includes(size) ? size as AiBatchSize : 250;
}

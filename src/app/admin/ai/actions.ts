"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createTranslationJob,
  listRecentTranslationActivity,
  pauseTranslationJob,
  processTranslationJob,
  resumeTranslationJob,
  saveProviderConfig,
  testProviderConfig,
} from "@/lib/ai/db-ai";
import { isAiProvider, parseBatchSize } from "@/lib/ai/types";

export type ProcessTranslationJobState = {
  status: "idle" | "success" | "error";
  message: string;
  jobId?: string;
  job?: {
    status: string;
    completed: number;
    failed: number;
    total: number;
    updatedAt: string;
  };
  activity?: Array<{
    title: string;
    status: string;
    attempts: number;
    error: string | null;
    updatedAt: string;
  }>;
};

export async function saveAiProviderAction(formData: FormData) {
  await requireAdmin();
  const provider = String(formData.get("provider") ?? "");
  if (!isAiProvider(provider)) throw new Error("Geçersiz AI provider.");
  await saveProviderConfig({
    provider,
    model: String(formData.get("model") ?? ""),
    apiKey: String(formData.get("api_key") ?? ""),
    enabled: formData.get("enabled") === "on",
  });
  revalidatePath("/admin/ai");
}

export async function testAiProviderAction(formData: FormData) {
  await requireAdmin();
  const provider = String(formData.get("provider") ?? "");
  if (!isAiProvider(provider)) throw new Error("Geçersiz AI provider.");
  await testProviderConfig(provider);
  revalidatePath("/admin/ai");
}

export async function createTranslationJobAction(formData: FormData) {
  const admin = await requireAdmin();
  const provider = String(formData.get("provider") ?? "");
  if (!isAiProvider(provider)) throw new Error("Geçersiz AI provider.");
  await createTranslationJob({
    provider,
    batchSize: parseBatchSize(String(formData.get("batch_size") ?? "")),
    createdBy: admin.id,
    retryFailedOnly: formData.get("retry_failed_only") === "on",
  });
  revalidatePath("/admin/ai");
}

export async function processTranslationJobAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("job_id") ?? "");
  if (!id) throw new Error("Çeviri işi eksik.");
  try {
    await processTranslationJob(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-translation] action.process.failed", { jobId: id, error: message });
  }
  revalidatePath("/admin/ai");
}

export async function processTranslationJobStateAction(_state: ProcessTranslationJobState, formData: FormData): Promise<ProcessTranslationJobState> {
  await requireAdmin();
  const id = String(formData.get("job_id") ?? "");
  if (!id) return { status: "error", message: "Çeviri işi eksik." };
  try {
    console.log("[ai-translation] action.process.state.start", { jobId: id });
    const job = await processTranslationJob(id);
    const activity = (await listRecentTranslationActivity(10)).filter((item) => item.jobId === id);
    revalidatePath("/admin/ai");
    const state: ProcessTranslationJobState = {
      status: "success",
      message: `İşlem tamamlandı: ${job.completedCount}/${job.totalCount}, hata ${job.failedCount}.`,
      jobId: id,
      job: {
        status: job.status,
        completed: job.completedCount,
        failed: job.failedCount,
        total: job.totalCount,
        updatedAt: job.updatedAt,
      },
      activity: activity.map((item) => ({
        title: item.title,
        status: item.status,
        attempts: item.attempts,
        error: item.errorMessage,
        updatedAt: item.updatedAt,
      })),
    };
    console.log("[ai-translation] action.process.state.done", state);
    return state;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-translation] action.process.state.failed", { jobId: id, error: message });
    revalidatePath("/admin/ai");
    return { status: "error", message, jobId: id };
  }
}

export async function pauseTranslationJobAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("job_id") ?? "");
  if (!id) throw new Error("Çeviri işi eksik.");
  await pauseTranslationJob(id);
  revalidatePath("/admin/ai");
}

export async function resumeTranslationJobAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("job_id") ?? "");
  if (!id) throw new Error("Çeviri işi eksik.");
  await resumeTranslationJob(id);
  revalidatePath("/admin/ai");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createTranslationJob,
  listRecentTranslationActivity,
  pauseTranslationJob,
  processTranslationJob,
  resumeTranslationJob,
  runTranslationAutomationTick,
  saveTranslationAutomation,
  saveProviderConfig,
  testProviderConfig,
} from "@/lib/ai/db-ai";
import { isAiProvider, parseBatchSize } from "@/lib/ai/types";

export type AiActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

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

export async function submitAiProviderConfigAction(_state: AiActionState, formData: FormData): Promise<AiActionState> {
  await requireAdmin();
  const provider = String(formData.get("provider") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  if (!isAiProvider(provider)) return { status: "error", message: "Geçersiz AI provider." };

  try {
    if (intent === "test") {
      await testProviderConfig(provider);
      revalidatePath("/admin/ai");
      return { status: "success", message: "DeepSeek bağlantısı başarılı." };
    }

    await saveProviderConfig({
      provider,
      model: String(formData.get("model") ?? ""),
      apiKey: String(formData.get("api_key") ?? ""),
      enabled: formData.get("enabled") === "on",
    });
    revalidatePath("/admin/ai");
    return { status: "success", message: "DeepSeek ayarı kaydedildi." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI ayarı kaydedilemedi.";
    console.error("[ai-translation] provider.action.failed", { provider, intent, error: message });
    return { status: "error", message };
  }
}

export async function createTranslationJobAction(formData: FormData) {
  const admin = await requireAdmin();
  await createTranslationJob({
    provider: "deepseek",
    batchSize: parseBatchSize(String(formData.get("batch_size") ?? "")),
    createdBy: admin.id,
    retryFailedOnly: formData.get("retry_failed_only") === "on",
  });
  revalidatePath("/admin/ai");
}

export async function saveTranslationAutomationAction(_state: AiActionState, formData: FormData): Promise<AiActionState> {
  await requireAdmin();
  try {
    await saveTranslationAutomation({
      enabled: formData.get("enabled") === "on",
      dailyTarget: Number(formData.get("daily_target") ?? 1000),
      perRunLimit: 2,
      retryFailed: formData.get("retry_failed") === "on",
    });
    revalidatePath("/admin/ai");
    return { status: "success", message: "Otomatik çeviri ayarı güncellendi." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Otomatik çeviri ayarı kaydedilemedi.";
    console.error("[ai-translation] automation.save.failed", { error: message });
    return { status: "error", message };
  }
}

export async function runTranslationAutomationNowAction() {
  await requireAdmin();
  await runTranslationAutomationTick("admin");
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

export async function pauseTranslationJobAction(_state: AiActionState, formData: FormData): Promise<AiActionState> {
  await requireAdmin();
  const id = String(formData.get("job_id") ?? "");
  if (!id) return { status: "error", message: "Çeviri işi eksik." };
  try {
    await pauseTranslationJob(id);
    revalidatePath("/admin/ai");
    return { status: "success", message: "Çeviri işi duraklatıldı." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Çeviri işi duraklatılamadı.";
    console.error("[ai-translation] job.pause.failed", { jobId: id, error: message });
    return { status: "error", message };
  }
}

export async function resumeTranslationJobAction(_state: AiActionState, formData: FormData): Promise<AiActionState> {
  await requireAdmin();
  const id = String(formData.get("job_id") ?? "");
  if (!id) return { status: "error", message: "Çeviri işi eksik." };
  try {
    await resumeTranslationJob(id);
    revalidatePath("/admin/ai");
    return { status: "success", message: "Çeviri işi devam ettirildi." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Çeviri işi devam ettirilemedi.";
    console.error("[ai-translation] job.resume.failed", { jobId: id, error: message });
    return { status: "error", message };
  }
}

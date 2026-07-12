"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createTranslationJob,
  pauseTranslationJob,
  processTranslationJob,
  resumeTranslationJob,
  saveProviderConfig,
  testProviderConfig,
} from "@/lib/ai/db-ai";
import { isAiProvider, parseBatchSize } from "@/lib/ai/types";

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

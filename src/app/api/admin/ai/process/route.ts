import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { listRecentTranslationActivity, processTranslationJob } from "@/lib/ai/db-ai";

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json().catch(() => null) as { jobId?: unknown } | null;
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!jobId) return NextResponse.json({ error: "Çeviri işi eksik." }, { status: 400 });

  try {
    console.log("[ai-translation] api.process.start", { jobId });
    const job = await processTranslationJob(jobId, { limit: 1 });
    const activity = (await listRecentTranslationActivity(12)).filter((item) => item.jobId === jobId);
    revalidatePath("/admin/ai");
    const payload = {
      status: "success",
      message: `Adım tamamlandı: ${job.completedCount}/${job.totalCount}, hata ${job.failedCount}.`,
      jobId,
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
    console.log("[ai-translation] api.process.done", payload);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-translation] api.process.failed", { jobId, error: message });
    revalidatePath("/admin/ai");
    return NextResponse.json({ status: "error", message, jobId }, { status: 500 });
  }
}

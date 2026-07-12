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
    let activity: Awaited<ReturnType<typeof listRecentTranslationActivity>> = [];
    try {
      activity = await listRecentTranslationActivity(12, jobId);
    } catch (activityError) {
      console.error("[ai-translation] api.process.activity_failed", {
        jobId,
        error: activityError instanceof Error ? activityError.message : String(activityError),
      });
    }
    try {
      revalidatePath("/admin/ai");
    } catch (revalidateError) {
      console.error("[ai-translation] api.process.revalidate_failed", {
        jobId,
        error: revalidateError instanceof Error ? revalidateError.message : String(revalidateError),
      });
    }
    const payload = {
      status: "success",
      message: `Adım tamamlandı: ${job.completedCount}/${job.totalCount}, hata ${job.failedCount}.`,
      jobId,
      processed: "processed" in job && typeof job.processed === "number" ? job.processed : 0,
      failed: "failedStep" in job && typeof job.failedStep === "number" ? job.failedStep : 0,
      continued: job.status !== "paused" && job.status !== "cancelled" && job.status !== "completed" && job.completedCount + job.failedCount < job.totalCount,
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
    try {
      revalidatePath("/admin/ai");
    } catch (revalidateError) {
      console.error("[ai-translation] api.process.failed_revalidate_failed", {
        jobId,
        error: revalidateError instanceof Error ? revalidateError.message : String(revalidateError),
      });
    }
    return NextResponse.json({ status: "error", message, jobId }, { status: 500 });
  }
}

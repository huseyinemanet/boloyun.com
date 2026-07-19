import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { processTranslationJob } from "@/lib/ai/db-ai";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const admin = await requireAdmin();
  const body = await request.json().catch(() => null) as { jobId?: unknown; limit?: unknown } | null;
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!jobId) return NextResponse.json({ error: "Çeviri işi eksik." }, { status: 400 });
  const limit = typeof body?.limit === "number" && Number.isFinite(body.limit)
    ? Math.max(1, Math.min(25, Math.round(body.limit)))
    : 20;

  try {
    console.log("[ai-translation] api.process.start", { jobId, limit });
    const job = await processTranslationJob(jobId, { limit });
    await recordAdminAudit({
      actorProfileId: admin.id,
      action: "ai.translation_job_process",
      targetType: "ai_translation_job",
      targetIds: [jobId],
      details: { limit },
    }).catch((auditError) => console.error("[admin-audit] AI işleme kaydı yazılamadı", auditError));
    const payload = {
      status: "success",
      message: `Adım tamamlandı: ${job.completedCount}/${job.totalCount}, hata ${job.failedCount}.`,
      jobId,
      attempted: "attempted" in job && typeof job.attempted === "number" ? job.attempted : 0,
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
    };
    console.log("[ai-translation] api.process.done", payload);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ai-translation] api.process.failed", { jobId, error: message });
    return NextResponse.json({ status: "error", message, jobId }, { status: 500 });
  }
}

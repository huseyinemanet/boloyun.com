import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { countTranslationActivity, getTranslationStats, listRecentJobs, listRecentTranslationActivity } from "@/lib/ai/db-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    if (profile.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });

    const [stats, jobs] = await Promise.all([
      getTranslationStats(),
      listRecentJobs(),
    ]);
    const activeJob = jobs.find((job) => job.status === "running") ?? jobs.find((job) => job.status === "queued") ?? jobs[0];
    const activityLimit = Math.min(Math.max(activeJob?.totalCount ?? 20, 20), 500);
    const [activity, activityTotal] = await Promise.all([
      listRecentTranslationActivity(activityLimit, activeJob?.id),
      countTranslationActivity(activeJob?.id),
    ]);

    return NextResponse.json(
      { stats, jobs, activity, activityTotal, serverTime: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI aktivite özeti okunamadı.";
    console.error("[ai-translation] activity.failed", { error: message });
    return NextResponse.json(
      { error: message, serverTime: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}

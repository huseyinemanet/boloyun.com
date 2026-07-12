import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { countTranslationActivity, listRecentJobs, listRecentTranslationActivity } from "@/lib/ai/db-ai";

export const dynamic = "force-dynamic";
const DEFAULT_ACTIVITY_LIMIT = 50;
const MAX_ACTIVITY_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    if (profile.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });

    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? DEFAULT_ACTIVITY_LIMIT);
    const activityLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.floor(requestedLimit), MAX_ACTIVITY_LIMIT))
      : DEFAULT_ACTIVITY_LIMIT;
    const jobs = await listRecentJobs();
    const activeJob = jobs.find((job) => job.status === "running") ?? jobs.find((job) => job.status === "queued") ?? jobs[0];
    const [activity, activityTotal] = await Promise.all([
      listRecentTranslationActivity(activityLimit, activeJob?.id),
      countTranslationActivity(activeJob?.id),
    ]);

    return NextResponse.json(
      { jobs, activity, activityTotal, activityLimit, serverTime: new Date().toISOString() },
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

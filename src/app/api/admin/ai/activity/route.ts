import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getTranslationStats, listRecentJobs, listRecentTranslationActivity } from "@/lib/ai/db-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    if (profile.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });

    const [stats, jobs, activity] = await Promise.all([
      getTranslationStats(),
      listRecentJobs(),
      listRecentTranslationActivity(),
    ]);

    return NextResponse.json(
      { stats, jobs, activity, serverTime: new Date().toISOString() },
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

import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAiDashboardData } from "@/lib/ai/db-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  if (profile.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });

  const { stats, jobs, activity } = await getAiDashboardData();
  return NextResponse.json(
    { stats, jobs, activity, serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

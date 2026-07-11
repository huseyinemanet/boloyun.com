import { NextResponse } from "next/server";
import { getPublicSettings } from "@/lib/db-settings";

export async function GET() {
  const { integrations } = await getPublicSettings();
  return NextResponse.json(integrations, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } });
}

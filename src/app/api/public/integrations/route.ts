import { NextResponse } from "next/server";
import { getPublicSettings } from "@/lib/db-settings";
import { cacheHeaders } from "@/lib/cache-policy";

export async function GET() {
  const { integrations } = await getPublicSettings();
  return NextResponse.json(integrations, { headers: cacheHeaders("publicData") });
}

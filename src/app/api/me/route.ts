import { NextResponse } from "next/server";
import { resolveCurrentProfileForClient } from "@/lib/auth";
import { cacheHeaders } from "@/lib/cache-policy";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const routeClient = await createSupabaseRouteClient();
  const result = await resolveCurrentProfileForClient(routeClient.supabase);
  const headers = new Headers(cacheHeaders("privateNoStore"));
  headers.set("Vary", "Cookie");

  if (result.status === "unavailable") {
    return routeClient.applyTo(NextResponse.json(
      { status: result.status, profile: null, code: "viewer_unavailable" },
      { status: 503, headers },
    ));
  }

  const profile = result.profile
    ? {
        id: result.profile.id,
        username: result.profile.username,
        email: result.profile.email,
        avatarUrl: result.profile.avatarUrl,
        firstName: result.profile.firstName,
        lastName: result.profile.lastName,
        displayName: result.profile.displayName,
        role: result.profile.role,
        status: result.profile.status,
      }
    : null;

  return routeClient.applyTo(
    NextResponse.json({ status: result.status, profile }, { headers }),
  );
}

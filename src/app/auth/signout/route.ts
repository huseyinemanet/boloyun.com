import { NextResponse } from "next/server";
import { publicUrlFromRequest } from "@/lib/request-origin";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const routeClient = await createSupabaseRouteClient();
  await routeClient.supabase?.auth.signOut();
  return routeClient.applyTo(NextResponse.redirect(publicUrlFromRequest(request, "/"), 303));
}

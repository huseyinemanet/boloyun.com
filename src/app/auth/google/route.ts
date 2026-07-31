import { NextResponse, type NextRequest } from "next/server";
import { getRequestOrigin, publicUrlFromRequest } from "@/lib/request-origin";
import { buildOAuthCallbackUrl, safeOAuthPath } from "@/lib/security/navigation";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const next = safeOAuthPath(request.nextUrl.searchParams.get("next"));
  const routeClient = await createSupabaseRouteClient();
  if (!routeClient.supabase) return redirectTo(request, "/giris?error=config");

  const { data, error } = await routeClient.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildOAuthCallbackUrl(await getRequestOrigin(), next),
    },
  });

  if (error || !data.url) return routeClient.applyTo(redirectTo(request, `/giris?error=google&next=${encodeURIComponent(next)}`));
  return routeClient.applyTo(NextResponse.redirect(data.url, 303));
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(publicUrlFromRequest(request, path), 303);
}

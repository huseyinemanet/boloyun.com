import { NextResponse } from "next/server";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { cacheHeaders } from "@/lib/cache-policy";
import { normalizeSiteAssetUrl } from "@/lib/site-assets";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const routeClient = await createSupabaseRouteClient();

  try {
    if (!routeClient.supabase) {
      return viewerResponse(routeClient, {
        status: "unavailable",
        profile: null,
        code: "viewer_unavailable",
      }, 503);
    }

    const { data: userResult, error: userError } = await routeClient.supabase.auth.getUser();
    if (userError && !isAuthSessionMissingError(userError)) {
      console.error("[api/me] auth user could not be read", toLogError(userError));
      return viewerResponse(routeClient, {
        status: "unavailable",
        profile: null,
        code: "viewer_unavailable",
      }, 503);
    }

    const user = userResult.user;
    if (!user?.id) {
      return viewerResponse(routeClient, {
        status: "anonymous",
        profile: null,
      });
    }

    const service = createSupabaseServiceClient();
    if (!service) {
      return viewerResponse(routeClient, {
        status: "unavailable",
        profile: null,
        code: "viewer_unavailable",
      }, 503);
    }

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("id, username, avatar_url, first_name, last_name, display_name, role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[api/me] viewer profile could not be read", toLogError(profileError ?? new Error("Profile missing.")));
      return viewerResponse(routeClient, {
        status: "unavailable",
        profile: null,
        code: "viewer_unavailable",
      }, 503);
    }

    return viewerResponse(routeClient, {
      status: "authenticated",
      profile: {
        id: profile.id,
        username: profile.username,
        email: user.email ?? "",
        avatarUrl: normalizeSiteAssetUrl(profile.avatar_url),
        firstName: profile.first_name,
        lastName: profile.last_name,
        displayName: profile.display_name,
        role: profile.role ?? "member",
        status: profile.status ?? "active",
      },
    });
  } catch (error) {
    console.error("[api/me] viewer could not be read", toLogError(error));
    return viewerResponse(routeClient, {
      status: "unavailable",
      profile: null,
      code: "viewer_unavailable",
    }, 503);
  }
}

type ViewerResponseBody =
  | {
      status: "authenticated";
      profile: {
        id: string;
        username: string;
        email: string;
        avatarUrl: string | null;
        firstName: string | null;
        lastName: string | null;
        displayName: string | null;
        role: "admin" | "member";
        status: "active" | "blocked";
      };
    }
  | { status: "anonymous"; profile: null }
  | { status: "unavailable"; profile: null; code: "viewer_unavailable" };

function viewerResponse(
  routeClient: Awaited<ReturnType<typeof createSupabaseRouteClient>>,
  body: ViewerResponseBody,
  status = 200,
) {
  const response = NextResponse.json(body, {
    status,
    headers: cacheHeaders("privateNoStore"),
  });
  routeClient.applyTo(response);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

function toLogError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

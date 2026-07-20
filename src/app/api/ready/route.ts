import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { hasValidBearerSecret } from "@/lib/security/secret-comparison";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasValidBearerSecret(request.headers.get("authorization"), process.env.INTERNAL_HEALTH_CHECK_TOKEN)) {
    return new Response(null, { status: 404 });
  }
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return Response.json(
      { status: "not-ready", dependency: "supabase", reason: "configuration" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { error } = await supabase.from("site_settings").select("section").limit(1);
  if (error) {
    console.error("[readiness] supabase check failed", { code: error.code, message: error.message });
    return Response.json(
      { status: "not-ready", dependency: "supabase" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { status: "ready" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

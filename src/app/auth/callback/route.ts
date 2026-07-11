import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { migrateCurrentSessionFavorites } from "@/lib/auth-favorites";
import { safeLocalPath } from "@/lib/security/navigation";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase?.auth.exchangeCodeForSession(code) ?? { error: new Error("Supabase yapılandırılmamış.") };
    if (error) return NextResponse.redirect(new URL("/sifremi-unuttum?error=expired", request.url));
    const { data } = await supabase?.auth.getUser() ?? { data: { user: null } };
    if (data.user?.id) {
      await migrateCurrentSessionFavorites(data.user.id);
    }
  }

  return NextResponse.redirect(new URL(safeLocalPath(next), request.url));
}

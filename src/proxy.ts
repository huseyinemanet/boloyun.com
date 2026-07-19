import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isActiveAdminProfile } from "@/lib/security/admin-access";

function redirectWithAuthCookies(request: NextRequest, source: NextResponse, destination: string) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  for (const cookie of source.cookies.getAll()) {
    response.cookies.set(cookie.name, cookie.value, cookie);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isAdminLogin) return response;
    if (isAdminPath && !isAdminLogin) return redirectWithAuthCookies(request, response, "/giris?next=/admin");
    return redirectWithAuthCookies(request, response, "/giris?next=/profil");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (isAdminLogin) return response;
  if (!user) {
    const next = isAdminPath ? "/admin" : "/profil";
    return redirectWithAuthCookies(request, response, `/giris?next=${encodeURIComponent(next)}`);
  }

  if (isAdminPath && !isAdminLogin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isActiveAdminProfile(profile)) {
      return redirectWithAuthCookies(request, response, "/giris?next=/admin");
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/profil/:path*"],
};

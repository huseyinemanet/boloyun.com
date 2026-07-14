import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const TAXONOMY_CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":", 1)[0].toLocaleLowerCase("en-US");
  if (host === "www.boloyun.com") {
    const destination = request.nextUrl.clone();
    destination.host = "boloyun.com";
    destination.port = "";
    destination.protocol = "https:";
    return NextResponse.redirect(destination, 308);
  }

  if (isPublicTaxonomyRequest(request)) {
    const response = NextResponse.next({ request });
    response.headers.set("Cache-Control", TAXONOMY_CACHE_CONTROL);
    return response;
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(responseHeaders).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/auth/:path*",
    "/etiket/:path*",
    "/kategori/:path*",
    "/profil/:path*",
    "/rastgele/:path*",
  ],
};

function isPublicTaxonomyRequest(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return request.nextUrl.pathname.startsWith("/etiket/") || request.nextUrl.pathname.startsWith("/kategori/");
}

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

type AuthResponseMutation = {
  cookies: PendingCookie[];
  headers: Record<string, string>;
};

export async function createSupabaseServerClient(onMutation?: (mutation: AuthResponseMutation) => void) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          onMutation?.({ cookies: cookiesToSet, headers: responseHeaders });
        } catch {
          // Server Components cannot always write cookies; middleware and actions refresh sessions.
        }
      },
    },
  });
}

export async function createSupabaseRouteClient() {
  const mutations: AuthResponseMutation[] = [];
  const supabase = await createSupabaseServerClient((mutation) => mutations.push(mutation));

  return {
    supabase,
    applyTo(response: NextResponse) {
      for (const mutation of mutations) {
        for (const cookie of mutation.cookies) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
        for (const [name, value] of Object.entries(mutation.headers)) {
          response.headers.set(name, value);
        }
      }
      return response;
    },
  };
}

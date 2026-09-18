import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { createEgressFetch } from "@/lib/supabase/egress-fetch";

export type SupabaseBrowserConfig = {
  url: string;
  anonKey: string;
};

export function createSupabaseBrowserClient(config?: SupabaseBrowserConfig) {
  const url = config?.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = config?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}

export function createSupabaseServiceClient() {
  if (process.env.BOL_OYUN_PREBUILD_FALLBACK === "1") {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    ...(process.env.SUPABASE_EGRESS_LOG === "1" ? {
      global: { fetch: createEgressFetch(fetch, (measurement) => console.info(JSON.stringify(measurement))) },
    } : {}),
    auth: {
      persistSession: false,
    },
  });
}

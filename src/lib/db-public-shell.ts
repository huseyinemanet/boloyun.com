import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { measuredQuery } from "@/lib/query-observability";

export type PublicShellSettingsRow = {
  section: string;
  value: unknown;
  updated_at: string | null;
  updated_by_label: string | null;
};

export type PublicNavCategory = {
  id: string;
  name: string;
  slug: string;
  icon_svg: string | null;
  icon_url: string | null;
  sidebar_sort_order: number;
};

export type PublicShellAd = {
  slot_key: string;
  id: string;
  name: string;
  ad_code: string;
  show_desktop: boolean | null;
  show_mobile: boolean | null;
};

export type PublicShellSnapshot = {
  settings: PublicShellSettingsRow[];
  categories: PublicNavCategory[];
  ads: PublicShellAd[];
};

const getPublicShellSnapshotCached = unstable_cache(async function getPublicShellSnapshotCached(): Promise<PublicShellSnapshot | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await measuredQuery(
    "public.shell.snapshot",
    supabase.rpc("get_public_shell_snapshot"),
  );
  if (error || !data || typeof data !== "object") return null;

  const snapshot = data as Partial<PublicShellSnapshot>;
  return {
    settings: Array.isArray(snapshot.settings) ? snapshot.settings : [],
    categories: Array.isArray(snapshot.categories) ? snapshot.categories : [],
    ads: Array.isArray(snapshot.ads) ? snapshot.ads : [],
  };
}, ["public-shell-snapshot-v1"], {
  revalidate: 3600,
  tags: ["public-shell", "site-settings", "categories", "ads"],
});

export const getPublicShellSnapshot = cache(getPublicShellSnapshotCached);

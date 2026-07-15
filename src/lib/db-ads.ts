import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { getPublicShellSnapshot } from "@/lib/db-public-shell";

export type AdSlotRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  page_type: string | null;
  position: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdRow = {
  id: string;
  slot_id: string;
  name: string;
  ad_code: string;
  is_active: boolean | null;
  show_desktop: boolean | null;
  show_mobile: boolean | null;
  start_at: string | null;
  end_at: string | null;
  priority: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const defaultAdSlots = [
  ["homepage_top_banner", "Ana sayfa üst banner", "Ana sayfanın en üst reklam alanı.", "homepage", "top"],
  ["homepage_between_sections", "Ana sayfa bölümler arası", "Oyun bölümleri arasında gösterilir.", "homepage", "between_sections"],
  ["sidebar_top", "Sidebar üst", "Masaüstü sol menü üst reklam alanı.", "global", "sidebar_top"],
  ["sidebar_middle", "Sidebar orta", "Masaüstü sol menü orta reklam alanı.", "global", "sidebar_middle"],
  ["game_page_top", "Oyun sayfası üst", "Oyun detay sayfasında player üstü.", "game", "top"],
  ["game_preroll", "Oyun açılış reklamı", "Oyunu Başlat işleminden sonra oyun yüklenmeden önce gösterilir.", "game", "preroll"],
  ["game_page_below_player", "Player altı", "Oyunu Başlat alanının altında gösterilir.", "game", "below_player"],
  ["game_page_before_comments", "Yorumlar öncesi", "Yorum bölümünden önce gösterilir.", "game", "before_comments"],
  ["category_page_top", "Kategori sayfası üst", "Kategori listelerinin üst reklam alanı.", "category", "top"],
  ["search_results_top", "Arama sonuçları üst", "Arama sonuçlarının üstünde gösterilir.", "search", "top"],
  ["mobile_sticky_bottom", "Mobil alt sabit", "Mobilde alt kısımda sabit reklam alanı.", "global", "mobile_sticky_bottom"],
] as const;

export type AdminAdManagerData = {
  slots: AdSlotRow[];
  ads: AdRow[];
};

export type PublicAd = Pick<AdRow, "id" | "name" | "ad_code" | "show_desktop" | "show_mobile">;

const getPublicAdForSlotCached = unstable_cache(async function getPublicAdForSlotCached(slotKey: string): Promise<PublicAd | null> {
  const snapshot = await getPublicShellSnapshot();
  const ad = snapshot?.ads.find((item) => item.slot_key === slotKey);
  return ad ? {
    id: ad.id,
    name: ad.name,
    ad_code: ad.ad_code,
    show_desktop: ad.show_desktop,
    show_mobile: ad.show_mobile,
  } : null;
}, ["public-ad-slot-v2"], { revalidate: 3600, tags: ["ads", "public-shell"] });

export async function getPublicAdForSlot(slotKey: string): Promise<PublicAd | null> {
  return getPublicAdForSlotCached(slotKey);
}

export const getAdminAdManagerData = cache(async function getAdminAdManagerData(): Promise<AdminAdManagerData> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      slots: defaultAdSlots.map(([key, name, description, pageType, position], index) => ({
        id: `fallback-${index}`,
        key,
        name,
        description,
        page_type: pageType,
        position,
        is_active: true,
      })),
      ads: [],
    };
  }

  await ensureDefaultAdSlots();

  const [{ data: slots, error: slotsError }, { data: ads, error: adsError }] = await Promise.all([
    supabase.from("ad_slots").select("*").order("page_type", { ascending: true }).order("position", { ascending: true }),
    supabase.from("ads").select("*").order("priority", { ascending: false }).order("updated_at", { ascending: false }),
  ]);

  if (slotsError) throw new Error(`Reklam slotları okunamadı: ${slotsError.message}`);
  if (adsError) throw new Error(`Reklamlar okunamadı: ${adsError.message}`);

  return {
    slots: (slots ?? []) as AdSlotRow[],
    ads: (ads ?? []) as AdRow[],
  };
});

export async function upsertAdminAdSlot(formData: FormData) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const id = String(formData.get("id") ?? "");
  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!key || !name) {
    throw new Error("Slot anahtarı ve ad gerekli.");
  }

  const payload = {
    key,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    page_type: String(formData.get("page_type") ?? "").trim() || null,
    position: String(formData.get("position") ?? "").trim() || null,
    is_active: formData.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  };

  const query = id ? supabase.from("ad_slots").update(payload).eq("id", id) : supabase.from("ad_slots").insert(payload);
  const { error } = await query;
  if (error) throw new Error(`Reklam slotu kaydedilemedi: ${error.message}`);
}

export async function upsertAdminAd(formData: FormData) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const id = String(formData.get("id") ?? "");
  const slotId = String(formData.get("slot_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const adCode = String(formData.get("ad_code") ?? "").trim();

  if (!slotId || !name || !adCode) {
    throw new Error("Slot, reklam adı ve reklam kodu gerekli.");
  }

  const payload = {
    slot_id: slotId,
    name,
    ad_code: adCode,
    is_active: formData.get("is_active") === "on",
    show_desktop: formData.get("show_desktop") === "on",
    show_mobile: formData.get("show_mobile") === "on",
    start_at: toTimestamp(formData.get("start_at")),
    end_at: toTimestamp(formData.get("end_at")),
    priority: Number(formData.get("priority") ?? 0),
    updated_at: new Date().toISOString(),
  };

  const query = id ? supabase.from("ads").update(payload).eq("id", id) : supabase.from("ads").insert(payload);
  const { error } = await query;
  if (error) throw new Error(`Reklam kaydedilemedi: ${error.message}`);
}

async function ensureDefaultAdSlots() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const rows = defaultAdSlots.map(([key, name, description, pageType, position]) => ({
    key,
    name,
    description,
    page_type: pageType,
    position,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("ad_slots").upsert(rows, { onConflict: "key", ignoreDuplicates: true });
  if (error) throw new Error(`Varsayılan reklam slotları oluşturulamadı: ${error.message}`);
}

function toTimestamp(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return null;
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

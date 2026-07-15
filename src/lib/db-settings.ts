import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { DEFAULT_SETTINGS, getDefaultSettings } from "@/lib/settings/defaults";
import { SETTINGS_SECTIONS, type PublicSettings, type SettingsDataMap, type SettingsRecord, type SettingsSection } from "@/lib/settings/types";
import { validateSettingsSection } from "@/lib/settings/validation";
import type { HomepageSectionInput } from "@/lib/db-homepage-sections";
import { getPublicShellSnapshot } from "@/lib/db-public-shell";

type SettingsRow = {
  section: string;
  value: unknown;
  updated_at: string | null;
  updated_by_label: string | null;
};

export async function getSettingsSection<S extends SettingsSection>(section: S): Promise<SettingsRecord<S>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return fallbackRecord(section);

  const { data, error } = await supabase
    .from("site_settings")
    .select("section, value, updated_at, updated_by_label")
    .eq("section", section)
    .maybeSingle();

  if (error || !data) return fallbackRecord(section);
  return mapSettingsRow(section, data as SettingsRow);
}

export async function saveSettingsSection<S extends SettingsSection>({
  section,
  value,
  changedBy,
  changedByLabel,
}: {
  section: S;
  value: SettingsDataMap[S];
  changedBy: string | null;
  changedByLabel: string;
}): Promise<SettingsRecord<S>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase bağlantısı yapılandırılmamış.");
  const validValue = validateSettingsSection(section, value);
  const { data, error } = await supabase.rpc("save_site_settings", {
    p_section: section,
    p_value: validValue,
    p_changed_by: changedBy,
    p_changed_by_label: changedByLabel,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SettingsRow | null;
  if (!row) throw new Error("Ayar kaydı tamamlanamadı.");
  return mapSettingsRow(section, row);
}

export async function saveAppearanceAndHomepage({ value, changedBy, changedByLabel, homepageSections }: {
  value: SettingsDataMap["appearance"];
  changedBy: string | null;
  changedByLabel: string;
  homepageSections: HomepageSectionInput[];
}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase bağlantısı yapılandırılmamış.");
  const validValue = validateSettingsSection("appearance", value);
  const { data, error } = await supabase.rpc("save_appearance_and_homepage_atomic", {
    p_value: validValue,
    p_changed_by: changedBy,
    p_changed_by_label: changedByLabel,
    p_sections: homepageSections.map((section) => ({
      id: section.id, title: section.title, section_type: section.sectionType, source_type: section.sourceType,
      source_id: section.sourceId, manual_game_ids: section.manualGameIds, limit_count: section.limitCount,
      sort_order: section.sortOrder, visibility: section.visibility, status: section.status,
    })),
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SettingsRow | null;
  if (!row) throw new Error("Ayar ve ana sayfa kaydı tamamlanamadı.");
  return mapSettingsRow("appearance", row);
}

const getCachedPublicSettings = unstable_cache(async (): Promise<PublicSettings> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return publicDefaults(true);
  const snapshot = await getPublicShellSnapshot();
  let data: SettingsRow[] | null = snapshot?.settings ?? null;
  if (!data) {
    const result = await supabase.from("site_settings").select("section, value, updated_at, updated_by_label");
    if (result.error || !result.data) return publicDefaults(true);
    data = result.data as SettingsRow[];
  }
  const rows = new Map(data.map((row) => [row.section, row]));
  return {
    general: readValue("general", rows.get("general")),
    appearance: readValue("appearance", rows.get("appearance")),
    games: readValue("games", rows.get("games")),
    seo: readValue("seo", rows.get("seo")),
    ads: readValue("ads", rows.get("ads")),
    community: readValue("community", rows.get("community")),
    integrations: readValue("integrations", rows.get("integrations")),
    security: readValue("security", rows.get("security")),
    audio: readValue("audio", rows.get("audio")),
  };
}, ["public-site-settings-v3"], { tags: ["site-settings", "public-shell"], revalidate: 3600 });

export async function getPublicSettings() {
  try {
    return await getCachedPublicSettings();
  } catch (error) {
    console.error("[settings] public settings could not be read", toLogError(error));
    return publicDefaults(true);
  }
}

export async function getAllSettingsRecords() {
  return Promise.all(SETTINGS_SECTIONS.map((section) => getSettingsSection(section)));
}

function readValue<S extends SettingsSection>(section: S, row?: SettingsRow): SettingsDataMap[S] {
  if (!row) return section === "security" ? failClosedSecurity() as unknown as SettingsDataMap[S] : getDefaultSettings(section);
  try { return validateSettingsSection(section, row.value); } catch { return section === "security" ? failClosedSecurity() as unknown as SettingsDataMap[S] : getDefaultSettings(section); }
}

function mapSettingsRow<S extends SettingsSection>(section: S, row: SettingsRow): SettingsRecord<S> {
  return {
    section,
    value: readValue(section, row),
    updatedAt: row.updated_at,
    updatedByLabel: row.updated_by_label,
  };
}

function fallbackRecord<S extends SettingsSection>(section: S): SettingsRecord<S> {
  return { section, value: getDefaultSettings(section), updatedAt: null, updatedByLabel: null };
}

function publicDefaults(failClosed = false): PublicSettings {
  return {
    general: structuredClone(DEFAULT_SETTINGS.general),
    appearance: structuredClone(DEFAULT_SETTINGS.appearance),
    games: structuredClone(DEFAULT_SETTINGS.games),
    seo: structuredClone(DEFAULT_SETTINGS.seo),
    ads: structuredClone(DEFAULT_SETTINGS.ads),
    community: structuredClone(DEFAULT_SETTINGS.community),
    integrations: structuredClone(DEFAULT_SETTINGS.integrations),
    security: failClosed ? failClosedSecurity() : structuredClone(DEFAULT_SETTINGS.security),
    audio: structuredClone(DEFAULT_SETTINGS.audio),
  };
}

function failClosedSecurity() {
  return { ...structuredClone(DEFAULT_SETTINGS.security), enforceIframeAllowlist: true, iframeAllowlist: [] };
}

function toLogError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

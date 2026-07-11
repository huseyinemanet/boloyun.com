import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { DEFAULT_SETTINGS, getDefaultSettings } from "@/lib/settings/defaults";
import { SETTINGS_SECTIONS, type PublicSettings, type SettingsDataMap, type SettingsRecord, type SettingsRevision, type SettingsSection } from "@/lib/settings/types";
import { validateSettingsSection } from "@/lib/settings/validation";
import type { HomepageSectionInput } from "@/lib/db-homepage-sections";

type SettingsRow = {
  section: string;
  value: unknown;
  version: number;
  updated_at: string | null;
  updated_by_label: string | null;
};

type RevisionRow = {
  id: string;
  section: string;
  version: number;
  snapshot: Record<string, unknown>;
  changed_keys: string[] | null;
  changed_by_label: string | null;
  restored_from_revision_id: string | null;
  created_at: string;
};

export async function getSettingsSection<S extends SettingsSection>(section: S): Promise<SettingsRecord<S>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return fallbackRecord(section);

  const { data, error } = await supabase
    .from("site_settings")
    .select("section, value, version, updated_at, updated_by_label")
    .eq("section", section)
    .maybeSingle();

  if (error || !data) return fallbackRecord(section);
  return mapSettingsRow(section, data as SettingsRow);
}

export async function getSettingsRevisions(section: SettingsSection, limit = 20): Promise<SettingsRevision[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("site_setting_revisions")
    .select("id, section, version, snapshot, changed_keys, changed_by_label, restored_from_revision_id, created_at")
    .eq("section", section)
    .order("version", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as RevisionRow[]).map((row) => ({
    id: row.id,
    section: row.section as SettingsSection,
    version: row.version,
    snapshot: row.snapshot,
    changedKeys: row.changed_keys ?? [],
    changedByLabel: row.changed_by_label,
    restoredFromRevisionId: row.restored_from_revision_id,
    createdAt: row.created_at,
  }));
}

export async function saveSettingsSection<S extends SettingsSection>({
  section,
  value,
  expectedVersion,
  changedBy,
  changedByLabel,
  restoredFromRevisionId,
}: {
  section: S;
  value: SettingsDataMap[S];
  expectedVersion: number;
  changedBy: string | null;
  changedByLabel: string;
  restoredFromRevisionId?: string | null;
}): Promise<SettingsRecord<S>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase bağlantısı yapılandırılmamış.");
  const validValue = validateSettingsSection(section, value);
  const { data, error } = await supabase.rpc("save_site_settings", {
    p_section: section,
    p_value: validValue,
    p_expected_version: expectedVersion,
    p_changed_by: changedBy,
    p_changed_by_label: changedByLabel,
    p_restored_from_revision_id: restoredFromRevisionId ?? null,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SettingsRow | null;
  if (!row) throw new Error("Ayar kaydı tamamlanamadı.");
  return mapSettingsRow(section, row);
}

export async function saveAppearanceAndHomepage({ value, expectedVersion, changedBy, changedByLabel, homepageSections }: {
  value: SettingsDataMap["appearance"];
  expectedVersion: number;
  changedBy: string | null;
  changedByLabel: string;
  homepageSections: HomepageSectionInput[];
}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase bağlantısı yapılandırılmamış.");
  const validValue = validateSettingsSection("appearance", value);
  const { data, error } = await supabase.rpc("save_appearance_and_homepage_atomic", {
    p_value: validValue,
    p_expected_version: expectedVersion,
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

export async function getRevision(section: SettingsSection, revisionId: string): Promise<SettingsRevision | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_setting_revisions")
    .select("id, section, version, snapshot, changed_keys, changed_by_label, restored_from_revision_id, created_at")
    .eq("section", section)
    .eq("id", revisionId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as RevisionRow;
  return {
    id: row.id,
    section: row.section as SettingsSection,
    version: row.version,
    snapshot: row.snapshot,
    changedKeys: row.changed_keys ?? [],
    changedByLabel: row.changed_by_label,
    restoredFromRevisionId: row.restored_from_revision_id,
    createdAt: row.created_at,
  };
}

const getCachedPublicSettings = unstable_cache(async (): Promise<PublicSettings> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return publicDefaults(true);
  const { data, error } = await supabase.from("site_settings").select("section, value, version, updated_at, updated_by_label");
  if (error || !data) return publicDefaults(true);
  const rows = new Map((data as SettingsRow[]).map((row) => [row.section, row]));
  return {
    general: readValue("general", rows.get("general")),
    appearance: readValue("appearance", rows.get("appearance")),
    games: readValue("games", rows.get("games")),
    seo: readValue("seo", rows.get("seo")),
    ads: readValue("ads", rows.get("ads")),
    community: readValue("community", rows.get("community")),
    integrations: readValue("integrations", rows.get("integrations")),
    security: readValue("security", rows.get("security")),
  };
}, ["public-site-settings-v1"], { tags: ["site-settings"], revalidate: 300 });

export async function getPublicSettings() {
  return getCachedPublicSettings();
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
    version: Number(row.version || 1),
    updatedAt: row.updated_at,
    updatedByLabel: row.updated_by_label,
  };
}

function fallbackRecord<S extends SettingsSection>(section: S): SettingsRecord<S> {
  return { section, value: getDefaultSettings(section), version: 1, updatedAt: null, updatedByLabel: null };
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
  };
}

function failClosedSecurity() {
  return { ...structuredClone(DEFAULT_SETTINGS.security), enforceIframeAllowlist: true, iframeAllowlist: [] };
}

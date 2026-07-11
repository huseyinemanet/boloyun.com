"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { getDisplayName, requireAdmin } from "@/lib/auth";
import { getRevision, getSettingsSection, saveAppearanceAndHomepage, saveSettingsSection } from "@/lib/db-settings";
import type { HomepageSectionInput } from "@/lib/db-homepage-sections";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/lib/settings/types";
import { validateSettingsSection } from "@/lib/settings/validation";
import { recordAdminAudit } from "@/lib/admin-audit";

type SaveInput = {
  section: SettingsSection;
  version: number;
  value: unknown;
  homepageSections?: HomepageSectionInput[];
};

export async function saveSettingsAction(input: SaveInput) {
  const admin = await requireAdmin();
  assertSection(input.section);
  const value = validateSettingsSection(input.section, input.value);
  const saved = input.section === "appearance" && input.homepageSections
    ? await saveAppearanceAndHomepage({ value: validateSettingsSection("appearance", input.value), expectedVersion: input.version, changedBy: isUuid(admin.id) ? admin.id : null, changedByLabel: getDisplayName(admin), homepageSections: input.homepageSections })
    : await saveSettingsSection({ section: input.section, value, expectedVersion: input.version, changedBy: isUuid(admin.id) ? admin.id : null, changedByLabel: getDisplayName(admin) });
  await recordAdminAudit({ actorProfileId: admin.id, action: "settings.save", targetType: "site_settings", details: { section: input.section, version: saved.version } });

  refreshSettingsRoutes(input.section);
  return { ok: true as const, record: saved };
}

export async function restoreSettingsAction(section: SettingsSection, revisionId: string, expectedVersion: number) {
  const admin = await requireAdmin();
  assertSection(section);
  if (!isUuid(revisionId)) throw new Error("Geçersiz sürüm kaydı.");
  const revision = await getRevision(section, revisionId);
  if (!revision) throw new Error("Sürüm kaydı bulunamadı.");
  const value = validateSettingsSection(section, revision.snapshot);
  const saved = await saveSettingsSection({
    section,
    value,
    expectedVersion,
    changedBy: isUuid(admin.id) ? admin.id : null,
    changedByLabel: getDisplayName(admin),
    restoredFromRevisionId: revisionId,
  });
  await recordAdminAudit({ actorProfileId: admin.id, action: "settings.restore", targetType: "site_settings", targetIds: [revisionId], details: { section, version: saved.version } });
  refreshSettingsRoutes(section);
  return { ok: true as const, record: saved };
}

export async function clearSettingsCacheAction() {
  await requireAdmin();
  revalidateTag("site-settings", "max");
  revalidateTag("games", "max");
  revalidatePath("/", "layout");
  return { ok: true as const, clearedAt: new Date().toISOString() };
}

export async function refreshSettingsRecordAction(section: SettingsSection) {
  await requireAdmin();
  assertSection(section);
  return getSettingsSection(section);
}

function refreshSettingsRoutes(section: SettingsSection) {
  updateTag("site-settings");
  revalidatePath(`/admin/settings/${section}`);
  revalidatePath("/", "layout");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
  revalidatePath("/ads.txt");
}

function assertSection(section: string): asserts section is SettingsSection {
  if (!SETTINGS_SECTIONS.includes(section as SettingsSection)) throw new Error("Geçersiz ayar bölümü.");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

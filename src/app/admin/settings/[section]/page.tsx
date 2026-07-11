import { notFound } from "next/navigation";
import { getHomepageSectionsAdmin } from "@/lib/db-homepage-sections";
import { getSettingsRevisions, getSettingsSection } from "@/lib/db-settings";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/lib/settings/types";
import { getSystemStatus } from "@/lib/system-status";
import { SettingsForm } from "../settings-form";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SETTINGS_SECTIONS.map((section) => ({ section }));
}

export default async function AdminSettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: rawSection } = await params;
  if (!SETTINGS_SECTIONS.includes(rawSection as SettingsSection)) notFound();
  const section = rawSection as SettingsSection;
  const [record, revisions, homepageSections, systemStatus] = await Promise.all([
    getSettingsSection(section),
    getSettingsRevisions(section),
    section === "appearance" ? getHomepageSectionsAdmin() : Promise.resolve([]),
    section === "system" || section === "security" || section === "integrations" ? getSystemStatus() : Promise.resolve(null),
  ]);
  return <SettingsForm record={record} revisions={revisions} homepageSections={homepageSections} systemStatus={systemStatus} />;
}

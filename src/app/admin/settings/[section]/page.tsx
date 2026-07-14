import { notFound } from "next/navigation";
import { getHomepageSectionsAdmin } from "@/lib/db-homepage-sections";
import { getSettingsSection } from "@/lib/db-settings";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/lib/settings/types";
import { getSystemStatus } from "@/lib/system-status";
import { SettingsForm } from "../settings-form";

export const dynamic = "force-dynamic";

const sectionTitles: Record<SettingsSection, string> = {
  general: "Genel Ayarlar",
  appearance: "Görünüm Ayarları",
  games: "Oyun Ayarları",
  seo: "SEO Ayarları",
  ads: "Reklam Ayarları",
  community: "Topluluk Ayarları",
  integrations: "Entegrasyon Ayarları",
  security: "Güvenlik Ayarları",
  audio: "Ses Ayarları",
  system: "Sistem Ayarları",
};

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SETTINGS_SECTIONS.includes(section as SettingsSection)) return adminPageMetadata("Ayarlar");
  return adminPageMetadata(sectionTitles[section as SettingsSection]);
}

export function generateStaticParams() {
  return SETTINGS_SECTIONS.map((section) => ({ section }));
}

export default async function AdminSettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: rawSection } = await params;
  if (!SETTINGS_SECTIONS.includes(rawSection as SettingsSection)) notFound();
  const section = rawSection as SettingsSection;
  const [record, homepageSections, systemStatus] = await Promise.all([
    getSettingsSection(section),
    section === "appearance" ? getHomepageSectionsAdmin() : Promise.resolve([]),
    section === "system" || section === "security" || section === "integrations" ? getSystemStatus() : Promise.resolve(null),
  ]);
  return <SettingsForm record={record} homepageSections={homepageSections} systemStatus={systemStatus} />;
}

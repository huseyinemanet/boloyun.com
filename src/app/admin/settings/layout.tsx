import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsTabs } from "./settings-tabs";

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3">
      <AdminPageHeader title="Ayarlar" description="Bol Oyun’un genel davranışlarını, görünümünü ve teknik bağlantılarını merkezi olarak yönet." />
      <SettingsTabs />
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsNavigation } from "./settings-navigation";

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3">
      <AdminPageHeader title="Ayarlar" description="Site deneyimini, yayın tercihlerini ve teknik servisleri tek yerden yönet." />
      <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start">
        <SettingsNavigation />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

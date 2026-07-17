"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminImportFilter, AdminImportStats } from "@/import/db/game-imports";

const tabs: Array<{ value: AdminImportFilter; label: string }> = [
  { value: "review", label: "İncelenecek" },
  { value: "needs_fix", label: "Düzeltilecek" },
  { value: "failed", label: "Başarısız" },
  { value: "approved", label: "Onaylanan" },
  { value: "rejected", label: "Reddedilen" },
];

export function ImportStatusTabs({ active, counts }: { active: AdminImportFilter; counts: AdminImportStats }) {
  const router = useRouter();
  return (
    <Tabs value={active} onValueChange={(value) => router.push(`/admin/imports?status=${value}`)}>
      <TabsList className="max-w-full overflow-x-auto">
        {tabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}<Badge variant="secondary">{counts[tab.value].toLocaleString("tr-TR")}</Badge></TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}

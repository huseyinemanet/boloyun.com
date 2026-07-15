import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { getAiDashboardData } from "@/lib/ai/db-ai";
import { AutomationProgressPanel } from "./automation-progress-panel";
import { AiDebugConsole } from "./ai-debug-console";
import { ProviderConfigForm } from "./provider-config-form";
import { RealtimeActivityPanel } from "./realtime-activity-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: "AI Merkezi",
};

export default async function AiCenterPage() {
  const { configs, stats, jobs, activity, activityTotal, automation } = await getAiDashboardData();
  const deepSeekConfig = configs.find((config) => config.provider === "deepseek") ?? configs[0];

  return (
    <div className="space-y-4">
      <AiDebugConsole jobs={jobs} activity={activity} />
      <AdminPageHeader
        title="AI Merkezi"
        description="Toplu AI çeviriyi aç, batch olarak çalıştır ve loglardan takip et."
      />

      <AutomationProgressPanel automation={automation} stats={stats} />

      <RealtimeActivityPanel initialStats={stats} initialJobs={jobs} initialActivity={activity} initialActivityTotal={activityTotal} />

      <DetailsSection
        title="DeepSeek ayarı"
        description="Model ve API key burada durur. Günlük çeviri işi bu ayarı kullanır."
      >
        {deepSeekConfig ? <ProviderConfigForm config={deepSeekConfig} /> : null}
      </DetailsSection>
    </div>
  );
}

function DetailsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <details className="group rounded-md border border-border bg-card p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="block text-lg font-bold">{title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-muted-foreground group-open:hidden">Aç</span>
        <span className="hidden shrink-0 text-sm font-semibold text-muted-foreground group-open:inline">Kapat</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SoundLink } from "@/components/audio/sound-link";
import { Button } from "@/components/ui/button";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { getAiDashboardData } from "@/lib/ai/db-ai";
import { AutomationProgressPanel } from "./automation-progress-panel";
import { AiDebugConsole } from "./ai-debug-console";
import { RealtimeActivityPanel } from "./realtime-activity-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: "AI Merkezi",
};

export default async function AiCenterPage() {
  const { stats, jobs, activity, activityTotal, automation } = await getAiDashboardData();

  return (
    <div className="space-y-4">
      <AiDebugConsole jobs={jobs} activity={activity} />
      <AdminPageHeader
        title="AI Merkezi"
        description="Toplu AI çeviriyi aç, batch olarak çalıştır ve loglardan takip et."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
        <p className="text-sm text-muted-foreground">Model ve API key ayarı artık merkezi ayarlar altında tutulur.</p>
        <Button asChild variant="outline" size="sm">
          <SoundLink href="/admin/settings/ai">AI Ayarlarını Aç</SoundLink>
        </Button>
      </div>

      <AutomationProgressPanel automation={automation} stats={stats} />

      <RealtimeActivityPanel initialStats={stats} initialJobs={jobs} initialActivity={activity} initialActivityTotal={activityTotal} />
    </div>
  );
}

import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { getAiDashboardData } from "@/lib/ai/db-ai";
import { requireAdmin } from "@/lib/auth";
import { AutomationProgressPanel } from "./automation-progress-panel";
import { AiDebugConsole } from "./ai-debug-console";
import { RealtimeActivityPanel } from "./realtime-activity-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: "AI Merkezi",
};

export default async function AiCenterPage() {
  await requireAdmin();
  const { stats, jobs, activity, activityTotal, automation } = await getAiDashboardData();

  return (
    <div className="space-y-4">
      <AiDebugConsole jobs={jobs} activity={activity} />
      <AdminPageHeader
        title="AI Merkezi"
        description="Oyun çevirilerini başlat, ilerlemeyi takip et ve sonuçları kontrol et."
      />

      <AutomationProgressPanel automation={automation} stats={stats} />

      <RealtimeActivityPanel initialStats={stats} initialJobs={jobs} initialActivity={activity} initialActivityTotal={activityTotal} />
    </div>
  );
}

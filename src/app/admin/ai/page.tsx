import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { getAiDashboardData } from "@/lib/ai/db-ai";
import { AI_PROVIDER_LABELS, DEFAULT_AI_MODELS, type AiProviderConfig } from "@/lib/ai/types";
import { maskFingerprint } from "@/lib/ai/crypto";
import { AutomationProgressPanel } from "./automation-progress-panel";
import { AiDebugConsole } from "./ai-debug-console";
import { AiJobsTable } from "./ai-jobs-table";
import {
  saveAiProviderAction,
  testAiProviderAction,
} from "./actions";
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
        description="Otomatik çeviriyi aç, günlük hedefi izle ve gerektiğinde müdahale et."
      />

      <AutomationProgressPanel automation={automation} stats={stats} />

      <RealtimeActivityPanel initialStats={stats} initialJobs={jobs} initialActivity={activity} initialActivityTotal={activityTotal} />

      <DetailsSection
        title="Geçmiş işler"
        description="Tamamlanan ve yarıda kalan batch kayıtları. Normalde otomasyon açıkken buraya girmen gerekmez."
      >
        <AiJobsTable jobs={jobs} />
      </DetailsSection>

      <DetailsSection
        title="DeepSeek ayarı"
        description="Model ve API key burada durur. Günlük çeviri işi bu ayarı kullanır."
      >
        {deepSeekConfig ? <ProviderConfigCard config={deepSeekConfig} /> : null}
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

function ProviderConfigCard({ config }: { config: AiProviderConfig }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{AI_PROVIDER_LABELS[config.provider]}</h2>
        <Badge variant={config.enabled ? "default" : "outline"}>{config.enabled ? "Aktif" : "Pasif"}</Badge>
      </div>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{maskFingerprint(config.keyFingerprint)}</p>
      <p className="mt-1 text-xs text-muted-foreground">Test: {testStatusText(config)}</p>

      <form action={saveAiProviderAction} className="mt-4 grid gap-3">
        <input type="hidden" name="provider" value={config.provider} />
        <label className="grid gap-1 text-sm font-bold">
          Model
          <Input name="model" defaultValue={config.model || DEFAULT_AI_MODELS[config.provider]} />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          API Key
          <Input name="api_key" type="password" placeholder={config.hasApiKey ? "Mevcut key korunur" : "API key gir"} autoComplete="off" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Checkbox name="enabled" defaultChecked={config.enabled} />
          Bu provider aktif olsun
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="submit" variant="outline" className="w-full">Kaydet</Button>
          <Button formAction={testAiProviderAction} variant="outline" type="submit" className="w-full">Test Et</Button>
        </div>
      </form>
    </section>
  );
}

function testStatusText(config: AiProviderConfig) {
  if (config.lastTestStatus === "success") return `Başarılı${config.lastTestAt ? `, ${formatDate(config.lastTestAt)}` : ""}`;
  if (config.lastTestStatus === "failed") return config.lastTestError || "Başarısız";
  return "Henüz test edilmedi";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

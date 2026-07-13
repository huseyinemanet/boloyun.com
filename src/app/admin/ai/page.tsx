import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { getAiDashboardData } from "@/lib/ai/db-ai";
import { AI_BATCH_SIZES, AI_PROVIDER_LABELS, DEFAULT_AI_MODELS, type AiProviderConfig, type AiTranslationAutomation, type AiTranslationStats } from "@/lib/ai/types";
import { maskFingerprint } from "@/lib/ai/crypto";
import { AiDebugConsole } from "./ai-debug-console";
import { AiJobsTable } from "./ai-jobs-table";
import {
  createTranslationJobAction,
  runTranslationAutomationNowAction,
  saveAiProviderAction,
  saveTranslationAutomationAction,
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
  const activeConfig = configs.find((config) => config.enabled) ?? configs.find((config) => config.provider === "deepseek") ?? configs[0];

  return (
    <div className="space-y-4">
      <AiDebugConsole jobs={jobs} activity={activity} />
      <AdminPageHeader
        title="AI Merkezi"
        description="Otomatik çeviriyi aç, günlük hedefi izle ve gerektiğinde müdahale et."
      />

      <AutomationPanel automation={automation} configs={configs} stats={stats} />

      <RealtimeActivityPanel initialStats={stats} initialJobs={jobs} initialActivity={activity} initialActivityTotal={activityTotal} />

      <DetailsSection
        title="Geçmiş işler"
        description="Tamamlanan ve yarıda kalan batch kayıtları. Normalde otomasyon açıkken buraya girmen gerekmez."
      >
        <AiJobsTable jobs={jobs} />
      </DetailsSection>

      <DetailsSection
        title="Manuel batch"
        description="Otomasyon dışında tek seferlik küçük bir iş başlatmak istersen kullan."
      >
        <ManualBatchForm configs={configs} activeConfig={activeConfig} />
      </DetailsSection>

      <DetailsSection
        title="Sağlayıcı ayarları"
        description="Model ve API key ayarları. Kaydedilen key düz metin olarak gösterilmez."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {configs.map((config) => <ProviderConfigCard key={config.provider} config={config} />)}
        </div>
      </DetailsSection>
    </div>
  );
}

function AutomationPanel({ automation, configs, stats }: { automation: AiTranslationAutomation; configs: AiProviderConfig[]; stats: AiTranslationStats }) {
  const todayProgress = `${automation.todayCompleted.toLocaleString("tr-TR")} / ${automation.dailyTarget.toLocaleString("tr-TR")}`;
  const totalProgress = `${stats.completed.toLocaleString("tr-TR")} / ${stats.totalPublished.toLocaleString("tr-TR")}`;
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Otomatik Çeviri</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Açıkken sistem küçük parçalar halinde çeviri yapar. Hata alan oyunlar işi durdurmaz; logda görünür.
          </p>
        </div>
        <Badge variant={automation.enabled ? "default" : "outline"}>{automationStatusText(automation)}</Badge>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-border bg-background/40 p-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Toplam" value={totalProgress} />
        <Metric label="Bugün" value={todayProgress} />
        <Metric label="Sırada" value={stats.pending.toLocaleString("tr-TR")} />
        <Metric label="Hata" value={stats.failed.toLocaleString("tr-TR")} tone={stats.failed ? "danger" : "muted"} />
        <Metric label="Son çalışma" value={automation.lastRunAt ? relativeDate(automation.lastRunAt) : "Henüz yok"} />
      </div>

      {automation.lastError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Son hata: {automation.lastError}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <form action={saveTranslationAutomationAction} className="grid items-end gap-3 md:grid-cols-[1fr_150px_150px_auto]">
          <label className="grid gap-1 text-sm font-bold">
            Provider
            <Select name="provider" defaultValue={automation.provider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Provider seç" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((config) => (
                  <SelectItem key={config.provider} value={config.provider}>{AI_PROVIDER_LABELS[config.provider]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Günlük hedef
            <Input name="daily_target" type="number" min={1} max={5000} defaultValue={automation.dailyTarget} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Tick limiti
            <Input name="per_run_limit" type="number" min={1} max={5} defaultValue={automation.perRunLimit} />
          </label>
          <label className="flex h-10 items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Checkbox name="enabled" defaultChecked={automation.enabled} />
            Açık
          </label>
          <input type="hidden" name="retry_failed" value="on" />
          <Button type="submit" variant="outline" className="md:col-span-4">Kaydet</Button>
        </form>

        <form action={runTranslationAutomationNowAction} className="flex items-end">
          <Button type="submit" variant="outline" className="w-full lg:w-auto">Bir Tick Çalıştır</Button>
        </form>
      </div>
    </section>
  );
}

function ManualBatchForm({ configs, activeConfig }: { configs: AiProviderConfig[]; activeConfig?: AiProviderConfig }) {
  return (
    <form action={createTranslationJobAction} className="grid items-end gap-3 md:grid-cols-[1fr_140px_auto_auto]">
      <label className="grid gap-1 text-sm font-bold">
        Provider
        <Select name="provider" defaultValue={activeConfig?.provider ?? "deepseek"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Provider seç" />
          </SelectTrigger>
          <SelectContent>
            {configs.map((config) => (
              <SelectItem key={config.provider} value={config.provider}>{AI_PROVIDER_LABELS[config.provider]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-sm font-bold">
        Batch
        <Select name="batch_size" defaultValue="25">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Batch seç" />
          </SelectTrigger>
          <SelectContent>
            {AI_BATCH_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size} oyun</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <label className="flex h-10 items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Checkbox name="retry_failed_only" />
        Sadece hatalılar
      </label>
      <Button type="submit" variant="outline" className="w-full">Yeni Batch Başlat</Button>
    </form>
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

function Metric({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "danger" }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={tone === "danger" ? "mt-1 truncate text-base font-bold text-destructive" : "mt-1 truncate text-base font-bold"}>{value}</p>
    </div>
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

function relativeDate(value: string) {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diffSeconds < 60) return "az önce";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;
  return `${Math.floor(diffHours / 24)} gün önce`;
}

function automationStatusText(automation: AiTranslationAutomation) {
  if (!automation.enabled) return "Kapalı";
  if (automation.status === "running") return "Çalışıyor";
  if (automation.status === "error") return "Hata var";
  if (automation.todayCompleted >= automation.dailyTarget) return "Günlük hedef doldu";
  return "Açık";
}

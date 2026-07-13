import type { Metadata } from "next";
import { IconArtificialIntelligenceFillDuo18, IconBrainSparkleFillDuo18, IconCircleCheckFillDuo18, IconTriangleWarningFillDuo18 } from "nucleo-ui-fill-duo-18";
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
        description="Türkçeleştirme durumunu izle, işleri devam ettir ve AI sağlayıcılarını yönet."
      />

      <StatsGrid stats={stats} />

      <AutomationPanel automation={automation} configs={configs} />

      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Çeviri İşleri</h2>
            <p className="mt-1 text-sm text-muted-foreground">Başlatılan batch işleri burada takip edilir; yarıda kalan işleri buradan devam ettirebilirsin.</p>
          </div>
        </div>
        <AiJobsTable jobs={jobs} />
      </section>

      <RealtimeActivityPanel initialStats={stats} initialJobs={jobs} initialActivity={activity} initialActivityTotal={activityTotal} />

      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Yeni Batch Oluştur</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Sıradaki yayınlı oyunlardan yeni bir iş listesi hazırla. Oyun adları korunur; açıklama, oynanış ve SEO metinleri Türkçeleştirilir.
            </p>
          </div>
          <Badge variant={activeConfig?.enabled ? "default" : "outline"}>
            {activeConfig ? `${AI_PROVIDER_LABELS[activeConfig.provider]} ${activeConfig.enabled ? "aktif" : "pasif"}` : "Provider yok"}
          </Badge>
        </div>

        <form action={createTranslationJobAction} className="mt-4 grid items-end gap-3 md:grid-cols-[1fr_140px_auto_auto]">
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
          <div>
            <Button type="submit" variant="outline" className="w-full">Yeni Batch Başlat</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold">AI Sağlayıcıları</h2>
          <p className="mt-1 text-sm text-muted-foreground">Model ve API key ayarlarını buradan yönet. Kaydedilen key düz metin olarak gösterilmez.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {configs.map((config) => <ProviderConfigCard key={config.provider} config={config} />)}
        </div>
      </section>
    </div>
  );
}

function AutomationPanel({ automation, configs }: { automation: AiTranslationAutomation; configs: AiProviderConfig[] }) {
  const progress = `${automation.todayCompleted.toLocaleString("tr-TR")} / ${automation.dailyTarget.toLocaleString("tr-TR")}`;
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Otomatik Çeviri</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cron her 2 dakikada küçük adımlar çalıştırır. Günlük hedef dolunca durur; hata alan oyunlar item bazında loglanır.
          </p>
        </div>
        <Badge variant={automation.enabled ? "default" : "outline"}>{automationStatusText(automation)}</Badge>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-border bg-background/40 p-3 text-sm md:grid-cols-4">
        <Metric label="Bugünkü ilerleme" value={progress} />
        <Metric label="Tick başına" value={`${automation.perRunLimit} oyun`} />
        <Metric label="Son çalışma" value={automation.lastRunAt ? relativeDate(automation.lastRunAt) : "Henüz yok"} />
        <Metric label="Son hata" value={automation.lastError || "Yok"} tone={automation.lastError ? "danger" : "muted"} />
      </div>

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
            Otomasyon açık
          </label>
          <input type="hidden" name="retry_failed" value="on" />
          <Button type="submit" variant="outline" className="md:col-span-4">Otomasyonu Kaydet</Button>
        </form>

        <form action={runTranslationAutomationNowAction} className="flex items-end">
          <Button type="submit" variant="outline" className="w-full lg:w-auto">Şimdi Bir Tick Çalıştır</Button>
        </form>
      </div>
    </section>
  );
}

function StatsGrid({ stats }: { stats: AiTranslationStats }) {
  const items = [
    { label: "Yayınlı oyun", value: stats.totalPublished, icon: IconArtificialIntelligenceFillDuo18 },
    { label: "Tamamlanan", value: stats.completed, icon: IconCircleCheckFillDuo18 },
    { label: "Sırada", value: stats.pending, icon: IconBrainSparkleFillDuo18 },
    { label: "Hatalı", value: stats.failed, icon: IconTriangleWarningFillDuo18 },
  ];
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted-foreground">{item.label}</span>
              <Icon className="size-5 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-black">{item.value.toLocaleString("tr-TR")}</p>
          </div>
        );
      })}
    </section>
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

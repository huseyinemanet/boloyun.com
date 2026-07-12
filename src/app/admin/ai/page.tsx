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
import { AI_BATCH_SIZES, AI_PROVIDER_LABELS, DEFAULT_AI_MODELS, type AiProviderConfig, type AiTranslationStats } from "@/lib/ai/types";
import { maskFingerprint } from "@/lib/ai/crypto";
import { AiDebugConsole } from "./ai-debug-console";
import { AiJobsTable } from "./ai-jobs-table";
import {
  createTranslationJobAction,
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
  const { configs, stats, jobs, activity, activityTotal } = await getAiDashboardData();
  const activeConfig = configs.find((config) => config.enabled) ?? configs.find((config) => config.provider === "deepseek") ?? configs[0];

  return (
    <div className="space-y-4">
      <AiDebugConsole jobs={jobs} activity={activity} />
      <AdminPageHeader
        title="AI Merkezi"
        description="Oyun metinlerini kontrollü batch işleriyle Türkçeleştir."
      />

      <StatsGrid stats={stats} />

      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Toplu Türkçeleştirme</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Her batch sıradaki yayınlı oyunları seçer. Oyun adları korunur, açıklama ve SEO metinleri Türkçeleştirilir.
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

      <section className="grid gap-3 lg:grid-cols-3">
        {configs.map((config) => <ProviderConfigCard key={config.provider} config={config} />)}
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Son Çeviri İşleri</h2>
            <p className="mt-1 text-sm text-muted-foreground">Batch işleri tek tek işlenir; yarıda kalan işi buradan devam ettirebilirsin.</p>
          </div>
        </div>
        <AiJobsTable jobs={jobs} />
      </section>

      <RealtimeActivityPanel initialStats={stats} initialJobs={jobs} initialActivity={activity} initialActivityTotal={activityTotal} />
    </div>
  );
}

function StatsGrid({ stats }: { stats: AiTranslationStats }) {
  const items = [
    { label: "Yayınlı oyun", value: stats.totalPublished, icon: IconArtificialIntelligenceFillDuo18 },
    { label: "Türkçeleştirilen", value: stats.completed, icon: IconCircleCheckFillDuo18 },
    { label: "Bekleyen", value: stats.pending, icon: IconBrainSparkleFillDuo18 },
    { label: "Hatalı", value: stats.failed, icon: IconTriangleWarningFillDuo18 },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-muted-foreground">{item.label}</span>
              <Icon className="size-5 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-black">{item.value.toLocaleString("tr-TR")}</p>
          </div>
        );
      })}
    </section>
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

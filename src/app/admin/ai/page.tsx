import type { Metadata } from "next";
import { AlertTriangleIcon } from "lucide-react";
import { IconArtificialIntelligenceFillDuo18, IconBrainSparkleFillDuo18, IconCircleCheckFillDuo18 } from "nucleo-ui-fill-duo-18";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { getAiDashboardData } from "@/lib/ai/db-ai";
import { AI_BATCH_SIZES, AI_PROVIDER_LABELS, DEFAULT_AI_MODELS, type AiProviderConfig, type AiTranslationActivity, type AiTranslationJob, type AiTranslationStats } from "@/lib/ai/types";
import { maskFingerprint } from "@/lib/ai/crypto";
import { AiDebugConsole } from "./ai-debug-console";
import {
  createTranslationJobAction,
  pauseTranslationJobAction,
  processTranslationJobAction,
  resumeTranslationJobAction,
  saveAiProviderAction,
  testAiProviderAction,
} from "./actions";
import { JobActionForm } from "./job-action-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: "AI Merkezi",
};

export default async function AiCenterPage() {
  const { configs, stats, jobs, activity } = await getAiDashboardData();
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

        <form action={createTranslationJobAction} className="mt-4 grid gap-3 rounded-md border border-border bg-background/40 p-3 md:grid-cols-[1fr_140px_auto_auto]">
          <label className="grid gap-1 text-sm font-bold">
            Provider
            <select name="provider" defaultValue={activeConfig?.provider ?? "deepseek"} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              {configs.map((config) => (
                <option key={config.provider} value={config.provider}>{AI_PROVIDER_LABELS[config.provider]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Batch
            <select name="batch_size" defaultValue="25" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              {AI_BATCH_SIZES.map((size) => <option key={size} value={size}>{size} oyun</option>)}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-muted-foreground">
            <input type="checkbox" name="retry_failed_only" className="size-4 accent-primary" />
            Sadece hatalılar
          </label>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Yeni Batch Başlat</Button>
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
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Durum</th>
                <th className="py-2 pr-3">Provider</th>
                <th className="py-2 pr-3">İlerleme</th>
                <th className="py-2 pr-3">Oluşturma</th>
                <th className="py-2 pr-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length ? jobs.map((job) => <JobRow key={job.id} job={job} />) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-semibold text-muted-foreground">Henüz çeviri işi yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ActivityPanel activity={activity} />
    </div>
  );
}

function StatsGrid({ stats }: { stats: AiTranslationStats }) {
  const items = [
    { label: "Yayınlı oyun", value: stats.totalPublished, icon: IconArtificialIntelligenceFillDuo18 },
    { label: "Türkçeleştirilen", value: stats.completed, icon: IconCircleCheckFillDuo18 },
    { label: "Bekleyen", value: stats.pending, icon: IconBrainSparkleFillDuo18 },
    { label: "Hatalı", value: stats.failed, icon: AlertTriangleIcon },
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
          <input type="checkbox" name="enabled" defaultChecked={config.enabled} className="size-4 accent-primary" />
          Bu provider aktif olsun
        </label>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">Kaydet</Button>
          <Button formAction={testAiProviderAction} variant="outline" type="submit">Test Et</Button>
        </div>
      </form>
    </section>
  );
}

function JobRow({ job }: { job: AiTranslationJob }) {
  const progress = `${job.completedCount.toLocaleString("tr-TR")} / ${job.totalCount.toLocaleString("tr-TR")}`;
  return (
    <tr className="border-b border-border/70 last:border-0">
      <td className="py-3 pr-3"><Badge variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "outline"}>{jobStatusText(job.status)}</Badge></td>
      <td className="py-3 pr-3 font-semibold">{AI_PROVIDER_LABELS[job.provider]} <span className="text-xs text-muted-foreground">{job.model}</span></td>
      <td className="py-3 pr-3">{progress}{job.failedCount ? <span className="ml-2 text-xs font-semibold text-destructive">Hata: {job.failedCount}</span> : null}</td>
      <td className="py-3 pr-3 text-muted-foreground">{formatDate(job.createdAt)}</td>
      <td className="py-3 pr-3">
        <div className="flex justify-end gap-2">
          {job.status === "paused" ? <JobAction job={job} action={resumeTranslationJobAction} label="Devam" /> : null}
          {job.status === "queued" || job.status === "running" ? <JobAction job={job} action={processTranslationJobAction} label="İşle" /> : null}
          {job.status === "queued" || job.status === "running" ? <JobAction job={job} action={pauseTranslationJobAction} label="Duraklat" variant="outline" /> : null}
        </div>
      </td>
    </tr>
  );
}

function JobAction({ job, action, label, variant = "default" }: { job: AiTranslationJob; action: (formData: FormData) => Promise<void>; label: string; variant?: "default" | "outline" }) {
  return <JobActionForm action={action} jobId={job.id} label={label} jobStatus={job.status} variant={variant} />;
}

function ActivityPanel({ activity }: { activity: AiTranslationActivity[] }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Son AI İşlem Logları</h2>
          <p className="mt-1 text-sm text-muted-foreground">Bu tablo browser console’daki özetle aynıdır; son item durumlarını gösterir.</p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Zaman</th>
              <th className="py-2 pr-3">Durum</th>
              <th className="py-2 pr-3">Oyun</th>
              <th className="py-2 pr-3">Deneme</th>
              <th className="py-2 pr-3">Hata</th>
            </tr>
          </thead>
          <tbody>
            {activity.length ? activity.map((item) => (
              <tr key={item.id} className="border-b border-border/70 last:border-0">
                <td className="py-3 pr-3 text-muted-foreground">{formatDate(item.updatedAt)}</td>
                <td className="py-3 pr-3"><Badge variant={item.status === "completed" ? "default" : item.status === "failed" ? "destructive" : "outline"}>{itemStatusText(item.status)}</Badge></td>
                <td className="max-w-[320px] truncate py-3 pr-3 font-semibold">{item.title}</td>
                <td className="py-3 pr-3">{item.attempts}</td>
                <td className="max-w-[360px] truncate py-3 pr-3 text-muted-foreground">{item.errorMessage ?? "-"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-8 text-center font-semibold text-muted-foreground">Henüz item logu yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function testStatusText(config: AiProviderConfig) {
  if (config.lastTestStatus === "success") return `Başarılı${config.lastTestAt ? `, ${formatDate(config.lastTestAt)}` : ""}`;
  if (config.lastTestStatus === "failed") return config.lastTestError || "Başarısız";
  return "Henüz test edilmedi";
}

function jobStatusText(status: AiTranslationJob["status"]) {
  const labels: Record<AiTranslationJob["status"], string> = {
    queued: "Sırada",
    running: "Çalışıyor",
    paused: "Durakladı",
    completed: "Tamamlandı",
    failed: "Başarısız",
    cancelled: "İptal",
  };
  return labels[status];
}

function itemStatusText(status: AiTranslationActivity["status"]) {
  const labels: Record<AiTranslationActivity["status"], string> = {
    pending: "Bekliyor",
    processing: "İşleniyor",
    completed: "Tamamlandı",
    failed: "Hatalı",
    skipped: "Atlandı",
  };
  return labels[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

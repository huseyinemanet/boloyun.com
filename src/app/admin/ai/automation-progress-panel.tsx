"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconCircleCheck2FillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleCheck2FillDuo18";
import { IconCircleWarningFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleWarningFillDuo18";
import { IconHourglassClockFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHourglassClockFillDuo18";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { AiTranslationAutomation, AiTranslationJob, AiTranslationStats } from "@/lib/ai/types";

type AutomationProgressPanelProps = {
  automation: AiTranslationAutomation;
  stats: AiTranslationStats;
};

type DashboardSnapshot = {
  stats?: AiTranslationStats;
  automation?: AiTranslationAutomation;
  jobs?: AiTranslationJob[];
  serverTime?: string;
};

export function AutomationProgressPanel({ automation: initialAutomation, stats: initialStats }: AutomationProgressPanelProps) {
  const router = useRouter();
  const [automation, setAutomation] = useState(initialAutomation);
  const [stats, setStats] = useState(initialStats);
  const [controlPending, setControlPending] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);
  const [completedPulse, setCompletedPulse] = useState(false);
  const previousCompleted = useRef(initialStats.completed);

  const isDone = stats.totalPublished > 0 && stats.completed >= stats.totalPublished;
  const isWorkerActive = automation.enabled && !isDone;
  const totalPercent = isDone ? 100 : stats.totalPublished > 0 ? Math.floor((stats.completed / stats.totalPublished) * 100) : 0;
  const statusText = controlPending ? "Güncelleniyor" : isWorkerActive ? "Çalışıyor" : isDone ? "Tamamlandı" : automationStatusText(automation);
  const totalProgress = useMemo(
    () => `${stats.completed.toLocaleString("tr-TR")} / ${stats.totalPublished.toLocaleString("tr-TR")}`,
    [stats.completed, stats.totalPublished],
  );
  const remainingCount = Math.max(0, stats.totalPublished - stats.completed - stats.failed - stats.processing);

  useEffect(() => {
    function handleDashboardSnapshot(event: Event) {
      const detail = (event as CustomEvent<DashboardSnapshot>).detail;
      if (detail?.stats) setStats(detail.stats);
      if (detail?.automation) setAutomation(detail.automation);
    }

    window.addEventListener("ai-translation:dashboard", handleDashboardSnapshot);
    return () => window.removeEventListener("ai-translation:dashboard", handleDashboardSnapshot);
  }, []);

  useEffect(() => {
    if (previousCompleted.current === stats.completed) return;
    previousCompleted.current = stats.completed;
    setCompletedPulse(true);
    const timeout = setTimeout(() => setCompletedPulse(false), 900);
    return () => clearTimeout(timeout);
  }, [stats.completed]);

  useEffect(() => {
    if (!isWorkerActive) return;

    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function refreshStats() {
      const controller = new AbortController();
      const abortTimeout = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch("/api/admin/ai/activity?limit=20", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const snapshot = await response.json() as DashboardSnapshot;
        if (disposed) return;
        if (snapshot.stats) setStats(snapshot.stats);
        if (snapshot.automation) setAutomation(snapshot.automation);
      } catch {
        // Canlı sayaç yardımcıdır; geçici okuma hatası arka plan işçisini durdurmaz.
      } finally {
        clearTimeout(abortTimeout);
        if (!disposed) timeout = setTimeout(refreshStats, 1500);
      }
    }

    timeout = setTimeout(refreshStats, 500);
    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [isWorkerActive]);

  async function updateAutomationEnabled(enabled: boolean) {
    setControlPending(true);
    setControlError(null);
    try {
      const response = await fetch("/api/admin/ai/automation/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const payload = await response.json().catch(() => null) as (DashboardSnapshot & { error?: string; message?: string }) | null;
      if (!response.ok || payload?.error) throw new Error(payload?.error || `HTTP ${response.status}`);

      if (payload?.automation) setAutomation(payload.automation);
      if (payload?.stats) setStats(payload.stats);
      window.dispatchEvent(new CustomEvent("ai-translation:dashboard", { detail: payload ?? {} }));
      window.dispatchEvent(new CustomEvent("ai-translation:process-loop", { detail: { active: enabled } }));

      if (enabled) {
        toast.success("Toplu çeviri başlatıldı.", { description: "İş artık VPS üzerinde arka planda devam eder." });
        void kickAutomationOnce();
      } else {
        toast.info("Toplu çeviri durduruldu.", { description: "Devam eden tek istek biter; yeni oyun alınmaz." });
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Otomasyon ayarı güncellenemedi.";
      setControlError(message);
      toast.error("Otomasyon güncellenemedi.", { description: message });
    } finally {
      setControlPending(false);
    }
  }

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <style>{`
        @keyframes ai-progress-stripes {
          from { background-position: 0 0; }
          to { background-position: 44px 0; }
        }
        .ai-live-progress [data-slot="progress-indicator"] {
          background-image: linear-gradient(
            45deg,
            color-mix(in srgb, var(--primary) 85%, white 15%) 25%,
            var(--primary) 25%,
            var(--primary) 50%,
            color-mix(in srgb, var(--primary) 85%, white 15%) 50%,
            color-mix(in srgb, var(--primary) 85%, white 15%) 75%,
            var(--primary) 75%,
            var(--primary)
          );
          background-size: 44px 44px;
        }
        .ai-live-progress.is-running [data-slot="progress-indicator"] {
          animation: ai-progress-stripes 0.85s linear infinite;
        }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Toplu AI Çeviri</h2>
          <p className="mt-0.5 max-w-2xl text-sm leading-5 text-muted-foreground">
            Başlatınca sistem oyunları sırayla çevirir. Bir oyun 3 kez sorun çıkarırsa onu atlar ve sıradakine geçer.
          </p>
        </div>
        <Badge variant={isWorkerActive ? "default" : "outline"}>{statusText}</Badge>
      </div>

      <div className="mt-4 grid gap-4">
        <Progress
          value={totalPercent}
          aria-label="Tamamlanan oyun ilerlemesi"
          className={isWorkerActive ? "ai-live-progress is-running" : "ai-live-progress"}
        >
          <div className="flex items-center justify-between gap-3">
            <ProgressLabel>Tamamlanan oyunlar</ProgressLabel>
            <ProgressValue />
          </div>
        </Progress>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4 py-3 text-sm">
        <MetricStat
          icon={<IconCircleCheck2FillDuo18 className="size-5" />}
          label="Tamamlandı"
          value={totalProgress}
          live={completedPulse}
        />
        <MetricStat
          icon={<IconHourglassClockFillDuo18 className="size-5" />}
          label="Bekleyen"
          value={remainingCount.toLocaleString("tr-TR")}
        />
        <MetricStat
          icon={<IconCircleWarningFillDuo18 className="size-5" />}
          label="Sorunlu / atlanan"
          value={stats.failed.toLocaleString("tr-TR")}
          tone={stats.failed ? "danger" : "muted"}
        />
      </div>

      {automation.lastError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Son hata: {automation.lastError}
        </p>
      ) : null}

      {controlError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Otomasyon güncellenemedi: {controlError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant={isWorkerActive ? "outline" : "default"}
          className="w-full sm:w-auto"
          disabled={controlPending || isDone}
          onClick={() => updateAutomationEnabled(!isWorkerActive)}
        >
          {controlPending ? "Bekle..." : isWorkerActive ? "Durdur" : "Başlat"}
        </Button>
      </div>
    </section>
  );
}

function MetricStat({
  icon,
  label,
  value,
  tone = "muted",
  live = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "muted" | "danger";
  live?: boolean;
}) {
  const iconClassName = tone === "danger" ? "text-destructive" : live ? "text-primary" : "text-primary";
  const valueClassName = tone === "danger" ? "text-lg font-bold text-destructive" : "text-lg font-bold";

  return (
    <div className={live ? "flex items-center gap-3 text-primary transition-colors" : "flex items-center gap-3 transition-colors"}>
      <span className={`grid size-5 shrink-0 place-items-center ${iconClassName}`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className={valueClassName} aria-live={live ? "polite" : undefined}>{value}</p>
      </div>
    </div>
  );
}

function automationStatusText(automation: AiTranslationAutomation) {
  if (!automation.enabled) return "Kapalı";
  if (automation.status === "running") return "Çalışıyor";
  if (automation.status === "error") return "Hata var";
  return "Açık";
}

async function kickAutomationOnce() {
  try {
    const response = await fetch("/api/admin/ai/automation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "admin-start", limit: 5 }),
    });
    const payload = await response.json().catch(() => null) as DashboardSnapshot | null;
    if (payload?.automation || payload?.stats) {
      window.dispatchEvent(new CustomEvent("ai-translation:dashboard", { detail: payload }));
    }
  } catch {
    // İlk dürtme başarısız olsa bile VPS işçisi sıradaki turda devam eder.
  }
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { AiTranslationActivity, AiTranslationJob, AiTranslationStats } from "@/lib/ai/types";

type ActivityPayload = {
  stats: AiTranslationStats;
  jobs: AiTranslationJob[];
  activity: AiTranslationActivity[];
  serverTime: string;
};

type RealtimeActivityPanelProps = {
  initialStats: AiTranslationStats;
  initialJobs: AiTranslationJob[];
  initialActivity: AiTranslationActivity[];
};

export function RealtimeActivityPanel({ initialStats, initialJobs, initialActivity }: RealtimeActivityPanelProps) {
  const [payload, setPayload] = useState<ActivityPayload>({
    stats: initialStats,
    jobs: initialJobs,
    activity: initialActivity,
    serverTime: new Date().toISOString(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const previousStatuses = useRef(new Map(initialActivity.map((item) => [item.id, item.status])));

  const runningJobIds = useMemo(() => new Set(payload.jobs.filter((job) => job.status === "running").map((job) => job.id)), [payload.jobs]);
  const hasRunningWork = runningJobIds.size > 0;
  const hasQueuedWork = payload.jobs.some((job) => job.status === "queued");
  const activityLabel = hasRunningWork ? "İşleniyor" : hasQueuedWork ? "Hazır" : "Durakladı";

  useEffect(() => {
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function refresh() {
      setIsRefreshing(true);
      try {
        const response = await fetch("/api/admin/ai/activity", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = await response.json() as ActivityPayload;
        if (disposed) return;
        logTransitions(previousStatuses.current, next.activity);
        previousStatuses.current = new Map(next.activity.map((item) => [item.id, item.status]));
        setPayload(next);
        setLastError(null);
      } catch (error) {
        if (!disposed) setLastError(error instanceof Error ? error.message : "Aktivite okunamadı.");
      } finally {
        if (!disposed) {
          setIsRefreshing(false);
          timeout = setTimeout(refresh, hasRunningWork ? 1200 : 3500);
        }
      }
    }

    timeout = setTimeout(refresh, 900);
    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [hasRunningWork]);

  const activeJob = payload.jobs.find((job) => job.status === "running") ?? payload.jobs.find((job) => job.status === "queued") ?? payload.jobs[0];

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <style>{`
        @keyframes ai-row-shimmer {
          0% { transform: translateX(-120%); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(160%); opacity: 0; }
        }
        .ai-processing-row {
          position: relative;
          overflow: hidden;
          background: color-mix(in srgb, var(--primary) 10%, transparent);
        }
        .ai-processing-row::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 55%;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 30%, white 30%), transparent);
          animation: ai-row-shimmer 1.35s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Son AI İşlem Logları</h2>
          <p className="mt-1 text-sm text-muted-foreground">İşlenen satır parlayarak gösterilir; duraklatılan işlerde animasyon durur.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="relative flex items-center gap-2">
            <span className={hasRunningWork ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-muted-foreground/50"} />
            {activityLabel}
          </span>
          <span>{isRefreshing ? "Yenileniyor..." : formatDate(payload.serverTime)}</span>
        </div>
      </div>

      {activeJob ? (
        <div className="mt-4 grid gap-3 rounded-md border border-border bg-background/40 p-3 text-sm sm:grid-cols-4">
          <Metric label="Aktif iş" value={`${activeJob.completedCount}/${activeJob.totalCount}`} />
          <Metric label="Durum" value={jobStatusText(activeJob.status)} />
          <Metric label="Hata" value={String(activeJob.failedCount)} tone={activeJob.failedCount ? "danger" : "muted"} />
          <Metric label="Bekleyen" value={String(Math.max(0, activeJob.totalCount - activeJob.completedCount - activeJob.failedCount))} />
        </div>
      ) : null}

      {lastError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Canlı log okunamadı: {lastError}
        </p>
      ) : null}

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
            {payload.activity.length ? payload.activity.map((item) => {
              const isActuallyProcessing = item.status === "processing" && runningJobIds.has(item.jobId);
              return (
              <tr key={item.id} className={`${isActuallyProcessing ? "ai-processing-row" : ""} border-b border-border/70 transition-colors last:border-0`}>
                <td className="py-3 pr-3 text-muted-foreground">{formatDate(item.updatedAt)}</td>
                <td className="py-3 pr-3"><Badge variant={item.status === "completed" ? "default" : item.status === "failed" ? "destructive" : "outline"}>{itemStatusText(item.status, isActuallyProcessing)}</Badge></td>
                <td className="max-w-[320px] truncate py-3 pr-3 font-semibold">{item.title}</td>
                <td className="py-3 pr-3">{item.attempts}</td>
                <td className="max-w-[360px] truncate py-3 pr-3 text-muted-foreground">{item.errorMessage ?? "-"}</td>
              </tr>
            );}) : (
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

function Metric({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "danger" }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={tone === "danger" ? "mt-1 text-lg font-black text-destructive" : "mt-1 text-lg font-black"}>{value}</p>
    </div>
  );
}

function logTransitions(previous: Map<string, AiTranslationActivity["status"]>, activity: AiTranslationActivity[]) {
  const changed = activity
    .filter((item) => previous.has(item.id) && previous.get(item.id) !== item.status)
    .map((item) => ({ title: item.title, from: previous.get(item.id), to: item.status, attempts: item.attempts, error: item.errorMessage }));
  if (changed.length) {
    console.groupCollapsed("[ai-translation] realtime.transitions");
    console.table(changed);
    console.groupEnd();
  }
}

function itemStatusText(status: AiTranslationActivity["status"], isActuallyProcessing: boolean) {
  if (status === "processing" && !isActuallyProcessing) return "Yarım kaldı";
  const labels: Record<AiTranslationActivity["status"], string> = {
    pending: "Bekliyor",
    processing: "İşleniyor",
    completed: "Tamamlandı",
    failed: "Hatalı",
    skipped: "Atlandı",
  };
  return labels[status];
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

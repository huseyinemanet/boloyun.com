"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AiTranslationActivity, AiTranslationAutomation, AiTranslationJob, AiTranslationStats } from "@/lib/ai/types";

type ActivityPayload = {
  stats?: AiTranslationStats;
  automation?: AiTranslationAutomation;
  jobs: AiTranslationJob[];
  activity: AiTranslationActivity[];
  activityTotal: number;
  activityLimit?: number;
  serverTime: string;
  error?: string;
};

type RealtimeActivityPanelProps = {
  initialStats: AiTranslationStats;
  initialJobs: AiTranslationJob[];
  initialActivity: AiTranslationActivity[];
  initialActivityTotal: number;
};

type ActivityTableRow = AiTranslationActivity & {
  isActuallyProcessing: boolean;
};

const LOG_LIMIT = 20;

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export function RealtimeActivityPanel({ initialStats, initialJobs, initialActivity, initialActivityTotal }: RealtimeActivityPanelProps) {
  const [payload, setPayload] = useState<ActivityPayload>({
    stats: initialStats,
    jobs: initialJobs,
    activity: initialActivity.slice(0, LOG_LIMIT),
    activityTotal: initialActivityTotal,
    activityLimit: LOG_LIMIT,
    serverTime: initialActivity[0]?.updatedAt ?? initialJobs[0]?.updatedAt ?? "1970-01-01T00:00:00.000Z",
  });
  const [now, setNow] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [processLoopActive, setProcessLoopActive] = useState(false);
  const previousStatuses = useRef(new Map(initialActivity.map((item) => [item.id, item.status])));
  const consecutiveErrors = useRef(0);
  const lastErrorToast = useRef("");

  const runningJobIds = new Set(payload.jobs.filter((job) => job.status === "running").map((job) => job.id));
  const hasRunningWork = Boolean(payload.automation?.enabled) || runningJobIds.size > 0 || processLoopActive;
  const activityRows: ActivityTableRow[] = payload.activity.slice(0, LOG_LIMIT).map((item) => ({
    ...item,
    isActuallyProcessing: item.status === "processing" && runningJobIds.has(item.jobId),
  }));

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleJobPatch(event: Event) {
      const detail = (event as CustomEvent<{
        jobId?: string;
        status?: AiTranslationJob["status"];
        completedCount?: number;
        failedCount?: number;
        totalCount?: number;
        updatedAt?: string;
      }>).detail;
      if (!detail?.jobId) return;
      setPayload((current) => ({
        ...current,
        jobs: current.jobs.map((job) => (
          job.id === detail.jobId
            ? {
                ...job,
                status: detail.status ?? job.status,
                completedCount: detail.completedCount ?? job.completedCount,
                failedCount: detail.failedCount ?? job.failedCount,
                totalCount: detail.totalCount ?? job.totalCount,
                updatedAt: detail.updatedAt ?? job.updatedAt,
              }
            : job
        )),
        serverTime: detail.updatedAt ?? current.serverTime,
      }));
    }
    function handleProcessLoop(event: Event) {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      setProcessLoopActive(Boolean(detail?.active));
    }
    window.addEventListener("ai-translation:jobs:patch", handleJobPatch);
    window.addEventListener("ai-translation:process-loop", handleProcessLoop);
    return () => {
      window.removeEventListener("ai-translation:jobs:patch", handleJobPatch);
      window.removeEventListener("ai-translation:process-loop", handleProcessLoop);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function refresh() {
      setIsRefreshing(true);
      const controller = new AbortController();
      const abortTimeout = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(`/api/admin/ai/activity?limit=${LOG_LIMIT}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = await response.json() as ActivityPayload;
        if (next.error) throw new Error(next.error);
        if (!Array.isArray(next.jobs) || !Array.isArray(next.activity) || typeof next.activityTotal !== "number") {
          throw new Error("Aktivite yanıtı eksik döndü.");
        }
        if (disposed) return;
        logTransitions(previousStatuses.current, next.activity);
        previousStatuses.current = new Map(next.activity.map((item) => [item.id, item.status]));
        window.dispatchEvent(new CustomEvent("ai-translation:jobs", { detail: { jobs: next.jobs } }));
        window.dispatchEvent(new CustomEvent("ai-translation:dashboard", {
          detail: {
            stats: next.stats,
            automation: next.automation,
            jobs: next.jobs,
            serverTime: next.serverTime,
          },
        }));
        setPayload((current) => ({
          ...next,
          stats: next.stats ?? current.stats,
          activity: next.activity.slice(0, LOG_LIMIT),
          activityLimit: LOG_LIMIT,
        }));
        consecutiveErrors.current = 0;
        lastErrorToast.current = "";
        setLastError(null);
      } catch (error) {
        if (!disposed) {
          consecutiveErrors.current += 1;
          if (consecutiveErrors.current >= 2) {
            const message = error instanceof Error ? error.message : "Aktivite okunamadı.";
            setLastError(message);
            if (lastErrorToast.current !== message) {
              lastErrorToast.current = message;
              toast.error("Canlı AI logları okunamadı.", { description: message });
            }
          }
        }
      } finally {
        clearTimeout(abortTimeout);
        if (!disposed) {
          setIsRefreshing(false);
          const errorDelay = Math.min(20000, 5000 * Math.max(1, consecutiveErrors.current));
          const nextDelay = consecutiveErrors.current ? errorDelay : hasRunningWork ? 1500 : 5000;
          timeout = setTimeout(refresh, nextDelay);
        }
      }
    }

    timeout = setTimeout(refresh, hasRunningWork ? 500 : 2000);
    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [hasRunningWork]);

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <style>{`
        @keyframes ai-row-shimmer {
          0% { background-position: 0 0, -65% 0; }
          100% { background-position: 0 0, 165% 0; }
        }
        .ai-processing-row {
          background-image:
            linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--primary) 10%, transparent)),
            linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 30%, white 30%), transparent);
          background-repeat: no-repeat;
          background-size: 100% 100%, 45% 100%;
          animation: ai-row-shimmer 1.35s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Canlı çeviri akışı</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Son {LOG_LIMIT} işlem gösterilir. Yeni işlem geldikçe liste yenilenir; eski satırlar otomatik düşer.
          </p>
        </div>
        <div className="text-right text-xs font-semibold text-muted-foreground">
          <p className="flex items-center justify-end gap-2">
            <span className={hasRunningWork ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-muted-foreground/50"} />
            {hasRunningWork ? "Çalışıyor" : "Beklemede"}
          </p>
          <p className="mt-1">{isRefreshing ? "Yenileniyor..." : formatDate(payload.serverTime)}</p>
        </div>
      </div>

      {lastError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Canlı log okunamadı: {lastError}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-md border border-border">
        <Table className="min-w-[860px] table-fixed">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-36">Zaman</TableHead>
              <TableHead className="w-32">Durum</TableHead>
              <TableHead>Oyun</TableHead>
              <TableHead className="w-24">Deneme</TableHead>
              <TableHead className="w-[320px]">Not</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityRows.length ? activityRows.map((item) => (
              <TableRow key={item.id} className={item.isActuallyProcessing ? "ai-processing-row" : ""}>
                <TableCell>
                  <time className="text-muted-foreground" dateTime={item.updatedAt} title={formatDate(item.updatedAt)}>
                    {relativeTime(item.updatedAt, now)}
                  </time>
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === "completed" ? "default" : item.status === "failed" || item.status === "skipped" ? "destructive" : "outline"}>
                    {itemStatusText(item.status, item.isActuallyProcessing)}
                  </Badge>
                </TableCell>
                <TableCell><GameActivityLink item={item} /></TableCell>
                <TableCell>{item.attempts}/3</TableCell>
                <TableCell>
                  <span className="block truncate text-muted-foreground" title={item.errorMessage ?? undefined}>
                    {activityNote(item)}
                  </span>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center font-semibold text-muted-foreground">
                  Henüz çeviri logu yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function GameActivityLink({ item }: { item: ActivityTableRow }) {
  const content = <span className="block min-w-0 truncate font-semibold" title={item.title}>{item.title}</span>;

  if (!item.slug) return content;

  return (
    <Link href={`/oyun/${item.slug}`} className="block min-w-0 text-foreground transition hover:text-primary">
      {content}
    </Link>
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
    processing: "Çevriliyor",
    completed: "Tamamlandı",
    failed: "Hatalı",
    skipped: "Atlandı",
  };
  return labels[status];
}

function activityNote(item: ActivityTableRow) {
  if (item.errorMessage) return item.errorMessage;
  if (item.isActuallyProcessing) return "AI çeviri isteği çalışıyor.";
  if (item.status === "completed") return "Oyun güncellendi.";
  if (item.status === "pending") return "Sırada.";
  if (item.status === "skipped") return "3 denemeden sonra atlandı.";
  return "-";
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function relativeTime(value: string, now: number) {
  const diffSeconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (diffSeconds < 10) return "az önce";
  if (diffSeconds < 60) return `${diffSeconds} sn önce`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
}

"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { AiTranslationAutomation, AiTranslationJob, AiTranslationStats } from "@/lib/ai/types";
import { saveTranslationAutomationAction, type AiActionState } from "./actions";

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

const initialAiActionState: AiActionState = {
  status: "idle",
  message: "",
};

const BULK_RETRY_LIMIT = 3;
const BULK_STEP_DELAY_MS = 250;

export function AutomationProgressPanel({ automation: initialAutomation, stats: initialStats }: AutomationProgressPanelProps) {
  const router = useRouter();
  const [actionState, formAction] = useActionState(saveTranslationAutomationAction, initialAiActionState);
  const [automation, setAutomation] = useState(initialAutomation);
  const [stats, setStats] = useState(initialStats);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkSteps, setBulkSteps] = useState(0);
  const [bulkAttempted, setBulkAttempted] = useState(0);
  const [bulkCompletedOrSkipped, setBulkCompletedOrSkipped] = useState(0);
  const [bulkFailedOrSkipped, setBulkFailedOrSkipped] = useState(0);
  const lastToastKey = useRef("");
  const stopBulkRequested = useRef(false);

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
    if (actionState.status === "idle" || !actionState.message) return;

    const toastKey = `${actionState.status}:${actionState.message}`;
    if (lastToastKey.current === toastKey) return;
    lastToastKey.current = toastKey;

    if (actionState.status === "success") {
      toast.success(actionState.message);
      router.refresh();
      return;
    }

    toast.error(actionState.message);
  }, [actionState.message, actionState.status, router]);

  const isDone = stats.totalPublished > 0 && stats.completed >= stats.totalPublished;
  const totalPercent = isDone ? 100 : stats.totalPublished > 0 ? Math.floor((stats.completed / stats.totalPublished) * 100) : 0;
  const statusText = bulkRunning ? "Çalışıyor" : isDone ? "Tamamlandı" : automationStatusText(automation);
  const totalProgress = useMemo(
    () => `${stats.completed.toLocaleString("tr-TR")} / ${stats.totalPublished.toLocaleString("tr-TR")}`,
    [stats.completed, stats.totalPublished],
  );
  const remainingCount = Math.max(0, stats.totalPublished - stats.completed - stats.failed - stats.processing);
  const currentRunText = bulkRunning
    ? bulkAttempted > 0
      ? `${bulkAttempted.toLocaleString("tr-TR")} oyun denendi, ${bulkCompletedOrSkipped.toLocaleString("tr-TR")} oyun sonuçlandı.`
      : bulkSteps > 0
        ? "Sunucu batch hazırlıyor; ilk sonuç bekleniyor."
        : "İlk batch başlatılıyor."
    : "Başlatınca oyunlar sırayla çevrilir; sorunlu oyunlar 3 denemeden sonra atlanır.";

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <style>{`
        @keyframes ai-working-stripes {
          from { background-position: 0 0; }
          to { background-position: 44px 0; }
        }
        .ai-working-bar {
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
          animation: ai-working-stripes 0.85s linear infinite;
        }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Toplu AI Çeviri</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Başlatınca sistem oyunları sırayla çevirir. Bir oyun 3 kez sorun çıkarırsa onu atlar ve sıradakine geçer.
          </p>
        </div>
        <Badge variant={bulkRunning || automation.enabled ? "default" : "outline"}>{statusText}</Badge>
      </div>

      <div className="mt-4 grid gap-4">
        {bulkRunning ? (
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-primary">Çeviri çalışıyor</p>
              <p className="text-sm font-medium text-muted-foreground">{currentRunText}</p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-primary/15">
              <div className="ai-working-bar h-full w-full" />
            </div>
          </div>
        ) : null}

        <Progress value={totalPercent} aria-label="Tamamlanan oyun ilerlemesi">
          <div className="flex items-center justify-between gap-3">
            <ProgressLabel>Tamamlanan oyunlar</ProgressLabel>
            <ProgressValue />
          </div>
        </Progress>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <MetricCard label="Tamamlandı" value={totalProgress} />
        <MetricCard label="Bekleyen" value={remainingCount.toLocaleString("tr-TR")} />
        <MetricCard label="Sorunlu / atlanan" value={stats.failed.toLocaleString("tr-TR")} tone={stats.failed ? "danger" : "muted"} />
      </div>

      {automation.lastError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Son hata: {automation.lastError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {bulkRunning ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stopBulkRequested.current = true;
            }}
          >
            Durdur
          </Button>
        ) : (
          <Button
            type="button"
            onClick={async () => {
              stopBulkRequested.current = false;
              setBulkRunning(true);
              setBulkSteps(0);
              setBulkAttempted(0);
              setBulkCompletedOrSkipped(0);
              setBulkFailedOrSkipped(0);
              window.dispatchEvent(new CustomEvent("ai-translation:process-loop", { detail: { active: true } }));
              try {
                const steps = await runBulkLoop((snapshot) => {
                  const { step, attempted, completedOrSkipped, failedOrSkipped, automation: nextAutomation } = snapshot;
                  setBulkSteps(step);
                  setBulkAttempted(attempted);
                  setBulkCompletedOrSkipped(completedOrSkipped);
                  setBulkFailedOrSkipped(failedOrSkipped);
                  if (nextAutomation) setAutomation(nextAutomation);
                }, stopBulkRequested);
                if (stopBulkRequested.current) {
                  toast.info("Toplu çeviri durduruldu.", { description: steps ? `${steps} çalışma turu tamamlandı.` : "Yeni çalışma turu başlatılmadı." });
                } else {
                  toast.success("Toplu çeviri turu tamamlandı.", { description: `${steps} çalışma turu tamamlandı. Loglar birazdan güncellenir.` });
                }
                router.refresh();
              } catch (error) {
                toast.error("Toplu çeviri durdu.", { description: error instanceof Error ? error.message : "Beklenmeyen hata oluştu." });
              } finally {
                setBulkRunning(false);
                stopBulkRequested.current = false;
                window.dispatchEvent(new CustomEvent("ai-translation:process-loop", { detail: { active: false } }));
              }
            }}
          >
            Başlat
          </Button>
        )}
        <p className="max-w-2xl text-sm text-muted-foreground" aria-live="polite">
          {bulkRunning
            ? bulkFailedOrSkipped > 0
              ? `${bulkFailedOrSkipped.toLocaleString("tr-TR")} oyun bu çalıştırmada sorunlu göründü; sistem takılmadan devam ediyor.`
              : "İşlem devam ediyor. Tamamlanan sayı başarılı oyun geldikçe artar."
            : currentRunText}
        </p>
      </div>

      <details className="mt-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-semibold">Otomasyon ayarı</summary>
        <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex h-10 items-center gap-2 text-sm font-medium text-muted-foreground">
            <Checkbox name="enabled" defaultChecked={automation.enabled} />
            Arka plan otomasyonu açık
          </label>
          <AutomationSubmitButton />
        </form>
      </details>
    </section>
  );
}

function MetricCard({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "danger" }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={tone === "danger" ? "mt-1 text-lg font-bold text-destructive" : "mt-1 text-lg font-bold"}>{value}</p>
    </div>
  );
}

function AutomationSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="w-full md:w-auto" disabled={pending}>
      {pending ? "Kaydediliyor..." : "Kaydet"}
    </Button>
  );
}

function automationStatusText(automation: AiTranslationAutomation) {
  if (!automation.enabled) return "Kapalı";
  if (automation.status === "running") return "Çalışıyor";
  if (automation.status === "error") return "Hata var";
  return "Açık";
}

async function runBulkLoop(
  onStep: (snapshot: {
    step: number;
    attempted: number;
    completedOrSkipped: number;
    failedOrSkipped: number;
    automation?: AiTranslationAutomation;
  }) => void,
  stopRequested: React.MutableRefObject<boolean>,
) {
  let steps = 0;
  let transientFailures = 0;
  let attemptedTotal = 0;
  let completedOrSkippedTotal = 0;
  let failedOrSkippedTotal = 0;

  while (!stopRequested.current) {
    const controller = new AbortController();
    const abortTimeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch("/api/admin/ai/automation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "admin-bulk" }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null) as {
        status?: "skipped" | "completed" | "error";
        message?: string;
        automation?: AiTranslationAutomation;
        stats?: AiTranslationStats;
        job?: { status: string; completedCount: number; failedCount: number; totalCount: number; id: string; updatedAt: string };
        attempted?: number;
        processed?: number;
        failed?: number;
      } | null;

      if (!response.ok || result?.status === "error") {
        if (isTransientStatus(response.status) && transientFailures < BULK_RETRY_LIMIT) {
          transientFailures += 1;
          await sleep(transientRetryDelay(transientFailures));
          continue;
        }
        throw new Error(result?.message || `HTTP ${response.status}`);
      }

      transientFailures = 0;
      if (result?.automation) {
        window.dispatchEvent(new CustomEvent("ai-translation:dashboard", {
          detail: { automation: result.automation, stats: result.stats, serverTime: new Date().toISOString() },
        }));
      }
      if (result?.job) {
        window.dispatchEvent(new CustomEvent("ai-translation:jobs:patch", {
          detail: {
            jobId: result.job.id,
            status: result.job.status,
            completedCount: result.job.completedCount,
            failedCount: result.job.failedCount,
            totalCount: result.job.totalCount,
            updatedAt: result.job.updatedAt,
          },
        }));
      }

      if (result?.status === "skipped") break;
      steps += 1;
      attemptedTotal += Math.max(0, result?.attempted ?? 0);
      completedOrSkippedTotal += Math.max(0, result?.processed ?? 0);
      failedOrSkippedTotal += Math.max(0, result?.failed ?? 0);
      onStep({
        step: steps,
        attempted: attemptedTotal,
        completedOrSkipped: completedOrSkippedTotal,
        failedOrSkipped: failedOrSkippedTotal,
        automation: result?.automation,
      });
      await sleep(BULK_STEP_DELAY_MS);
    } catch (error) {
      if (transientFailures < BULK_RETRY_LIMIT) {
        transientFailures += 1;
        await sleep(transientRetryDelay(transientFailures));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(abortTimeout);
    }
  }

  return steps;
}

function isTransientStatus(status: number) {
  return status === 0 || status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

function transientRetryDelay(failures: number) {
  return Math.min(5_000, 1_000 * failures);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

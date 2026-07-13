"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { AiTranslationAutomation, AiTranslationJob, AiTranslationStats } from "@/lib/ai/types";
import { saveTranslationAutomationAction } from "./actions";

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
  const [automation, setAutomation] = useState(initialAutomation);
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    function handleDashboardSnapshot(event: Event) {
      const detail = (event as CustomEvent<DashboardSnapshot>).detail;
      if (detail?.stats) setStats(detail.stats);
      if (detail?.automation) setAutomation(detail.automation);
    }

    window.addEventListener("ai-translation:dashboard", handleDashboardSnapshot);
    return () => window.removeEventListener("ai-translation:dashboard", handleDashboardSnapshot);
  }, []);

  const isDone = stats.totalPublished > 0 && stats.completed >= stats.totalPublished;
  const totalPercent = isDone ? 100 : stats.totalPublished > 0 ? Math.floor((stats.completed / stats.totalPublished) * 100) : 0;
  const todayPercent = automation.dailyTarget > 0 ? Math.min(100, Math.floor((automation.todayCompleted / automation.dailyTarget) * 100)) : 0;
  const statusText = isDone ? "Tüm çeviriler tamamlandı" : automationStatusText(automation);
  const totalProgress = useMemo(
    () => `${stats.completed.toLocaleString("tr-TR")} / ${stats.totalPublished.toLocaleString("tr-TR")}`,
    [stats.completed, stats.totalPublished],
  );
  const todayProgress = useMemo(
    () => `${automation.todayCompleted.toLocaleString("tr-TR")} / ${automation.dailyTarget.toLocaleString("tr-TR")}`,
    [automation.todayCompleted, automation.dailyTarget],
  );

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Otomatik Çeviri</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Açıkken cron arka planda çalışır. Günlük hedef dolunca o gün durur, ertesi gün kaldığı yerden devam eder.
          </p>
        </div>
        <Badge variant={automation.enabled ? "default" : "outline"}>{statusText}</Badge>
      </div>

      <div className="mt-4 grid gap-3">
        <Progress value={totalPercent} aria-label="Genel çeviri ilerlemesi">
          <div className="flex items-center justify-between gap-3">
            <ProgressLabel>Genel ilerleme</ProgressLabel>
            <ProgressValue />
          </div>
        </Progress>

        <Progress value={todayPercent} aria-label="Bugünkü çeviri ilerlemesi">
          <div className="flex items-center justify-between gap-3">
            <ProgressLabel>Bugünkü hedef</ProgressLabel>
            <ProgressValue />
          </div>
        </Progress>
      </div>

      <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
        {totalProgress} tamamlandı · Bugün {todayProgress}
      </p>

      {automation.lastError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Son hata: {automation.lastError}
        </p>
      ) : stats.failed ? (
        <p className="mt-2 text-sm font-semibold text-destructive">
          {stats.failed.toLocaleString("tr-TR")} oyun hatalı bekliyor; sistem diğer oyunlara devam eder.
        </p>
      ) : null}

      <form action={saveTranslationAutomationAction} className="mt-4 grid items-end gap-3 md:grid-cols-[180px_auto_1fr]">
        <label className="grid gap-1 text-sm font-bold">
          Günlük hedef
          <Input name="daily_target" type="number" min={1} max={5000} defaultValue={automation.dailyTarget} />
        </label>
        <label className="flex h-10 items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Checkbox name="enabled" defaultChecked={automation.enabled} />
          Açık
        </label>
        <input type="hidden" name="retry_failed" value="on" />
        <Button type="submit" variant="outline" className="w-full md:w-auto">Kaydet</Button>
      </form>
    </section>
  );
}

function automationStatusText(automation: AiTranslationAutomation) {
  if (!automation.enabled) return "Kapalı";
  if (automation.status === "running") return "Çalışıyor";
  if (automation.status === "error") return "Hata var";
  if (automation.todayCompleted >= automation.dailyTarget) return "Günlük hedef doldu";
  return "Açık";
}

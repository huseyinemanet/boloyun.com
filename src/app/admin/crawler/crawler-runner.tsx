"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CrawlerJob } from "@/import/crawler/types";

export function CrawlerRunner() {
  const [job, setJob] = useState<CrawlerJob | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notifiedJobId = useRef<string | null>(null);
  const isRunning = job?.status === "queued" || job?.status === "running";

  useEffect(() => {
    void fetchCrawlerJob().then((latest) => {
      if (!latest) return;
      setJob(latest);
      setHasStarted(true);
      setLogs([latest.message]);
      if (latest.status === "completed" || latest.status === "failed") notifiedJobId.current = latest.id;
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!job?.id || !isRunning) return;
    const jobId = job.id;
    const poll = async () => {
      try {
        const next = await fetchCrawlerJob(jobId);
        if (!next) return;
        setJob(next);
        setLogs((current) => current[0] === next.message ? current : [next.message, ...current].slice(0, 8));
        if ((next.status === "completed" || next.status === "failed") && notifiedJobId.current !== next.id) {
          notifiedJobId.current = next.id;
          if (next.status === "completed") {
            toast.success("Tarama tamamlandı.", {
              description: `${next.stats.inserted.toLocaleString("tr-TR")} yeni oyun eklendi, ${next.stats.pendingReview.toLocaleString("tr-TR")} oyun içeriği hazırlandı.`,
            });
          } else {
            toast.error("Tarama tamamlanamadı.", { description: next.errorMessage ?? next.message });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Crawler durumu okunamadı.";
        setLogs((current) => current[0] === message ? current : [message, ...current].slice(0, 8));
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 2_000);
    return () => window.clearInterval(interval);
  }, [isRunning, job?.id]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning || isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const payload = {
      sitemapUrl: String(formData.get("sitemap_url") || "https://www.miniplay.com/sitemap.xml"),
      discoverLimit: String(formData.get("discover_limit") || "100"),
      scrapeLimit: String(formData.get("scrape_limit") ?? ""),
      scrapeNow: formData.get("scrape_now") === "on",
    };

    setIsSubmitting(true);
    setHasStarted(true);
    setLogs(["Crawler işi kuyruğa ekleniyor."]);
    try {
      const response = await fetch("/admin/crawler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as { error?: string; job?: CrawlerJob } | null;
      if (!response.ok || !result?.job) throw new Error(result?.error || `Crawler başlatılamadı (HTTP ${response.status}).`);
      notifiedJobId.current = null;
      setJob(result.job);
      setLogs([result.job.message]);
      toast.success("Crawler işi kuyruğa alındı.", { description: "İş arka planda devam edecek; bu sayfayı kapatabilirsiniz." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Crawler çalıştırılamadı.";
      setLogs((current) => [message, ...current].slice(0, 8));
      toast.error("Tarama başlatılamadı.", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const stats = job?.stats;
  const progressPercent = getProgressPercent(job);
  const statusMessage = job?.errorMessage ?? job?.message ?? (isSubmitting ? "Kuyruğa ekleniyor..." : "Hazır.");
  const ok = job?.status === "completed" ? true : job?.status === "failed" ? false : null;

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold md:col-span-2">
          Sitemap URL
          <Input name="sitemap_url" defaultValue="https://www.miniplay.com/sitemap.xml" disabled={isRunning || isSubmitting} className="mt-1 h-10 disabled:bg-muted/40" />
        </label>
        <label className="block text-sm font-bold">
          Kaç URL taransın?
          <Input name="discover_limit" type="number" min="1" max="5000" defaultValue="100" disabled={isRunning || isSubmitting} className="mt-1 h-10 disabled:bg-muted/40" />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">Tek işte en fazla 5.000 URL keşfedilir.</span>
        </label>
        <label className="block text-sm font-bold">
          Kaç oyun işlensin?
          <Input name="scrape_limit" type="number" min="0" max="500" placeholder="En fazla 500" disabled={isRunning || isSubmitting} className="mt-1 h-10 disabled:bg-muted/40" />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">Boş bırakırsanız en fazla 500 oyun küçük partiler hâlinde işlenir.</span>
        </label>
        <AdminCheckboxField
          name="scrape_now"
          label="Yeni bulunan oyunları scrape et ve AI içeriğini hazırla"
          defaultChecked
          disabled={isRunning || isSubmitting}
          fieldClassName="md:col-span-2"
        />
        <div className="md:col-span-2">
          <Button disabled={isRunning || isSubmitting} className="h-10 px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Kuyruğa Ekleniyor..." : isRunning ? "Arka Planda Çalışıyor" : "Yeni Oyunları Tara"}
          </Button>
          {isRunning ? <p className="mt-2 text-xs text-muted-foreground">Bu sayfayı kapatabilirsiniz; işlem worker tarafından sürdürülecek.</p> : null}
        </div>
      </form>

      {hasStarted ? (
        <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Durum</p>
              <p className={`mt-1 text-sm font-bold ${ok === false ? "text-destructive" : ok === true ? "text-primary" : "text-foreground"}`}>{statusMessage}</p>
            </div>
            <p className="text-xs font-bold text-muted-foreground">{progressPercent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
          </div>

          {stats ? (
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <ProgressStat label="Bulunan URL" value={stats.discovered} />
              <ProgressStat label="Kontrol edilen" value={stats.duplicateChecked} />
              <ProgressStat label="Yeni eklenen" value={stats.inserted} />
              <ProgressStat label="Zaten vardı" value={stats.skipped} />
              <ProgressStat label="Bekleyen discovered" value={stats.pendingDiscovered} />
              <ProgressStat label="Bilgisi çekilen" value={stats.scraped} />
              <ProgressStat label="AI içerik" value={stats.aiGenerated} />
              <ProgressStat label="Hazırlanan" value={stats.pendingReview} />
              <ProgressStat label="Hata" value={stats.failed} />
              <ProgressStat label="URL limiti" value={stats.limit} />
              <ProgressStat label="İşlem limiti" value={stats.scrapeLimit} />
            </div>
          ) : null}

          {logs.length > 0 ? (
            <div className="mt-3 rounded-md bg-card p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Son işlemler</p>
              <div className="mt-2 space-y-1">
                {logs.map((log, index) => <p key={`${log}-${index}`} className="line-clamp-1 text-xs text-muted-foreground">{log}</p>)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

async function fetchCrawlerJob(jobId?: string) {
  const suffix = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
  const response = await fetch(`/admin/crawler/run${suffix}`, { cache: "no-store" });
  const result = await response.json().catch(() => null) as { error?: string; job?: CrawlerJob | null } | null;
  if (!response.ok) throw new Error(result?.error || `Crawler durumu okunamadı (HTTP ${response.status}).`);
  return result?.job ?? null;
}

function getProgressPercent(job: CrawlerJob | null) {
  if (!job) return 0;
  if (job.status === "completed") return 100;
  if (job.phase === "process" && job.stats.scrapeLimit > 0) return Math.min(99, Math.round((job.targetCursor / job.stats.scrapeLimit) * 100));
  if (job.stats.limit > 0) return Math.min(95, Math.round((job.stats.discovered / job.stats.limit) * 100));
  return 0;
}

function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}

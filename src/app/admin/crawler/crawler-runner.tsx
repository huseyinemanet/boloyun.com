"use client";

import { useState } from "react";
import { AdminCheckboxField } from "@/components/admin/admin-checkbox-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CrawlerStats = {
  requested: number;
  limit: number;
  discovered: number;
  duplicateChecked: number;
  inserted: number;
  skipped: number;
  pendingDiscovered: number;
  scrapeLimit: number;
  scraped: number;
  failed: number;
};

type CrawlerEvent =
  | {
      type: "progress";
      phase: string;
      message: string;
      stats: CrawlerStats;
    }
  | {
      type: "done";
      ok: boolean;
      message: string;
      stats: CrawlerStats;
    };

const emptyStats: CrawlerStats = {
  requested: 0,
  limit: 0,
  discovered: 0,
  duplicateChecked: 0,
  inserted: 0,
  skipped: 0,
  pendingDiscovered: 0,
  scrapeLimit: 0,
  scraped: 0,
  failed: 0,
};

export function CrawlerRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [message, setMessage] = useState("Hazır.");
  const [stats, setStats] = useState<CrawlerStats>(emptyStats);
  const [logs, setLogs] = useState<string[]>([]);
  const [ok, setOk] = useState<boolean | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning) return;

    const formData = new FormData(event.currentTarget);
    const payload = {
      sitemapUrl: String(formData.get("sitemap_url") || "https://www.miniplay.com/sitemap.xml"),
      discoverLimit: String(formData.get("discover_limit") || "100"),
      scrapeLimit: String(formData.get("scrape_limit") ?? ""),
      scrapeNow: formData.get("scrape_now") === "on",
    };

    setIsRunning(true);
    setHasStarted(true);
    setOk(null);
    setStats(emptyStats);
    setMessage("Başlatılıyor...");
    setLogs(["Crawler başlatıldı."]);

    try {
      const response = await fetch("/admin/crawler/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || `Crawler başlatılamadı (HTTP ${response.status}).`);
      }
      if (!response.headers.get("content-type")?.includes("application/x-ndjson")) throw new Error("Crawler beklenmeyen bir yanıt döndürdü.");

      if (!response.body) {
        throw new Error("Progress akışı başlatılamadı.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          handleCrawlerEvent(JSON.parse(line) as CrawlerEvent);
        }
      }

      if (buffer.trim()) {
        handleCrawlerEvent(JSON.parse(buffer) as CrawlerEvent);
      }
    } catch (error) {
      setOk(false);
      setMessage(error instanceof Error ? error.message : "Crawler çalıştırılamadı.");
      setLogs((current) => [error instanceof Error ? error.message : "Crawler çalıştırılamadı.", ...current].slice(0, 8));
    } finally {
      setIsRunning(false);
    }
  }

  function handleCrawlerEvent(event: CrawlerEvent) {
    setStats(event.stats);
    setMessage(event.message);
    setLogs((current) => [event.message, ...current].slice(0, 8));

    if (event.type === "done") {
      setOk(event.ok);
    }
  }

  const progressPercent = stats.limit > 0 ? Math.min(100, Math.round((stats.discovered / stats.limit) * 100)) : 0;

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold md:col-span-2">
          Sitemap URL
          <Input
            name="sitemap_url"
            defaultValue="https://www.miniplay.com/sitemap.xml"
            disabled={isRunning}
            className="mt-1 h-10 disabled:bg-muted/40"
          />
        </label>
        <label className="block text-sm font-bold">
          Kaç URL taransın?
          <Input
            name="discover_limit"
            type="number"
            min="1"
            max="100000"
            defaultValue="100"
            disabled={isRunning}
            className="mt-1 h-10 disabled:bg-muted/40"
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">500, 5.000, 10.000 veya 100.000 yazabilirsin. Üst sınır 100.000.</span>
        </label>
        <label className="block text-sm font-bold">
          Yeni eklenenlerden kaçı hemen scrape edilsin?
          <Input
            name="scrape_limit"
            type="number"
            min="0"
            max="100000"
            placeholder="Tamamı"
            disabled={isRunning}
            className="mt-1 h-10 disabled:bg-muted/40"
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">Boş bırakırsan yeni bulunan kayıtların tamamı scrape edilir. Sayı girersen o kadarını işler.</span>
        </label>
        <AdminCheckboxField
          name="scrape_now"
          label="Yeni bulunan oyunların bilgilerini hemen çek"
          defaultChecked
          disabled={isRunning}
          fieldClassName="md:col-span-2"
        />
        <div className="md:col-span-2">
          <Button disabled={isRunning} className="h-10 px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">
            {isRunning ? "Taranıyor..." : "Yeni Oyunları Tara"}
          </Button>
        </div>
      </form>

      {hasStarted ? (
        <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Durum</p>
              <p className={`mt-1 text-sm font-bold ${ok === false ? "text-destructive" : ok === true ? "text-primary" : "text-foreground"}`}>{message}</p>
            </div>
            <p className="text-xs font-bold text-muted-foreground">{progressPercent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <ProgressStat label="Bulunan URL" value={stats.discovered} />
            <ProgressStat label="Kontrol edilen" value={stats.duplicateChecked} />
            <ProgressStat label="Yeni eklenen" value={stats.inserted} />
            <ProgressStat label="Zaten vardı" value={stats.skipped} />
            <ProgressStat label="Bekleyen discovered" value={stats.pendingDiscovered} />
            <ProgressStat label="Scrape edilen" value={stats.scraped} />
            <ProgressStat label="Scrape hata" value={stats.failed} />
            <ProgressStat label="Uygulanan limit" value={stats.limit} />
            <ProgressStat label="Scrape limiti" value={stats.scrapeLimit} />
          </div>

          {logs.length > 0 ? (
            <div className="mt-3 rounded-md bg-card p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Son işlemler</p>
              <div className="mt-2 space-y-1">
                {logs.map((log, index) => (
                  <p key={`${log}-${index}`} className="line-clamp-1 text-xs text-muted-foreground">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}

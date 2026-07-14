import Link from "next/link";
import Image from "next/image";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminImports } from "@/import/db/game-imports";
import { CrawlerRunner } from "./crawler-runner";

type Props = {
  searchParams: Promise<{
    discovered?: string;
    inserted?: string;
    skipped?: string;
    scraped?: string;
    aiGenerated?: string;
    pendingReview?: string;
    failed?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminCrawlerPage({ searchParams }: Props) {
  const result = await searchParams;
  const latestImports = await getAdminImports(12);
  const hasResult = typeof result.inserted !== "undefined";

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Yeni Oyun Tara"
        description={<>Miniplay sitemap&apos;ini tarar, yeni oyun bilgilerini çeker, DeepSeek ile Türkçe içeriği hazırlayıp onay kuyruğuna alır.</>}
      />

      {hasResult ? (
        <section className="grid gap-3 md:grid-cols-6">
          <Stat label="Taranan URL" value={result.discovered ?? "0"} />
          <Stat label="Yeni eklenen" value={result.inserted ?? "0"} />
          <Stat label="Zaten vardı" value={result.skipped ?? "0"} />
          <Stat label="Bilgisi çekilen" value={result.scraped ?? "0"} />
          <Stat label="Onay kuyruğu" value={result.pendingReview ?? result.aiGenerated ?? "0"} />
          <Stat label="Hata" value={result.failed ?? "0"} />
        </section>
      ) : null}

      <CrawlerRunner />

      {latestImports.length ? (
        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Son Import Kayıtları</h2>
              <p className="mt-1 text-xs text-muted-foreground">En son güncellenen import kayıtları.</p>
            </div>
            <Link href="/admin/imports" className="rounded-md border border-border px-3 py-2 text-xs font-bold text-primary">
              Onay kuyruğunu aç
            </Link>
          </div>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
            {latestImports.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 bg-card p-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.thumbnail_url ? (
                      <Image
                        src={item.thumbnail_url}
                        alt={item.ai_title_tr || item.original_title || "Import görseli"}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center text-[10px] font-bold text-muted-foreground">Yok</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{item.ai_title_tr || item.original_title || item.source_url}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.source_url}</p>
                    {item.source_domain ? <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.source_domain}</p> : null}
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-bold">{item.import_status}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth";
import { adminPageMetadata } from "@/lib/seo/metadata";
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
export const metadata = adminPageMetadata("Yeni Oyun Tara");

export default async function AdminCrawlerPage({ searchParams }: Props) {
  await requireAdmin();
  const result = await searchParams;
  const hasResult = typeof result.inserted !== "undefined";

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Yeni Oyun Tara"
        description={<>Miniplay sitemap&apos;ini tarar, yeni oyun bilgilerini çeker ve DeepSeek ile Türkçe içeriği hazırlar.</>}
      />

      {hasResult ? (
        <section className="grid gap-3 md:grid-cols-6">
          <Stat label="Taranan URL" value={result.discovered ?? "0"} />
          <Stat label="Yeni eklenen" value={result.inserted ?? "0"} />
          <Stat label="Zaten vardı" value={result.skipped ?? "0"} />
          <Stat label="Bilgisi çekilen" value={result.scraped ?? "0"} />
          <Stat label="Hazırlanan" value={result.pendingReview ?? result.aiGenerated ?? "0"} />
          <Stat label="Hata" value={result.failed ?? "0"} />
        </section>
      ) : null}

      <CrawlerRunner />
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

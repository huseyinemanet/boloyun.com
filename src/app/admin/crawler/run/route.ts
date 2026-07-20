import { NextResponse } from "next/server";
import { recordAdminAudit } from "@/lib/admin-audit";
import { getCurrentProfile } from "@/lib/auth";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { parseCrawlerJobInput } from "@/import/crawler/config";
import { enqueueCrawlerJob, getActiveCrawlerJob, getCrawlerJob, getLatestCrawlerJob } from "@/import/crawler/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  if (profile.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });

  const jobId = new URL(request.url).searchParams.get("jobId");
  const job = jobId ? await getCrawlerJob(jobId) : await getLatestCrawlerJob();
  if (jobId && !job) return NextResponse.json({ error: "Crawler işi bulunamadı." }, { status: 404 });
  return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  if (profile.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });

  const parsedBody = await request.json().catch(() => null);
  if (!isRecord(parsedBody)) return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 });

  let input: ReturnType<typeof parseCrawlerJobInput>;
  try {
    input = parseCrawlerJobInput(parsedBody, profile.id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Geçersiz crawler ayarı." }, { status: 400 });
  }

  try {
    const activeJob = await getActiveCrawlerJob();
    if (activeJob) {
      return NextResponse.json({ error: "Devam eden crawler işi tamamlanmadan yeni bir iş başlatılamaz.", job: activeJob }, { status: 409 });
    }

    const job = await enqueueCrawlerJob(input);
    await recordAdminAudit({
      actorProfileId: profile.id,
      action: "crawler.enqueue",
      targetType: "crawler_job",
      targetIds: [job.id],
      details: {
        sourceUrl: job.sitemapUrl,
        discoverLimit: job.discoverLimit,
        scrapeLimit: job.requestedScrapeLimit,
        scrapeNow: job.scrapeNow,
      },
    }).catch((error) => console.error("[crawler] enqueue audit failed", error));
    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Crawler işi kuyruğa alınamadı.";
    console.error("[crawler] enqueue failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

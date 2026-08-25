import { recordAdminAudit } from "@/lib/admin-audit";
import { GAME_EXPORT_SELECT, gameExportCsvHeader, gameExportCsvRow, gameExportFilename, type GameExportRow } from "@/lib/game-export-csv";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { authorizeAdminRoute } from "@/lib/security/admin-route-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 500;

export async function GET(request: Request) {
  const access = await authorizeAdminRoute(request, { mode: "redirect", continuePath: "/admin/settings/system" });
  if (!access.allowed) return access.response;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return Response.json({ error: "Veritabanı bağlantısı yapılandırılmamış." }, { status: 503 });

  const fetchPage = async (afterId: string | null) => {
    let query = supabase
      .from("games")
      .select(GAME_EXPORT_SELECT)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (afterId) query = query.gt("id", afterId);
    return query;
  };

  const firstPage = await fetchPage(null);
  if (firstPage.error) {
    console.error("[game-export] first page failed", firstPage.error);
    return Response.json({ error: "Oyun verileri dışa aktarılamadı." }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`\uFEFF${gameExportCsvHeader()}`));

      void (async () => {
        let rows = (firstPage.data ?? []) as unknown as GameExportRow[];
        let exportedCount = 0;

        try {
          while (rows.length > 0 && !request.signal.aborted) {
            controller.enqueue(encoder.encode(rows.map(gameExportCsvRow).join("")));
            exportedCount += rows.length;

            if (rows.length < PAGE_SIZE) break;
            const lastId = rows.at(-1)?.id;
            if (typeof lastId !== "string") throw new Error("Son oyun kimliği okunamadı.");

            const page = await fetchPage(lastId);
            if (page.error) throw new Error(page.error.message);
            rows = (page.data ?? []) as unknown as GameExportRow[];
          }

          if (!request.signal.aborted) controller.close();
          await recordAdminAudit({
            actorProfileId: access.admin.id,
            action: "game.export",
            targetType: "game",
            details: { format: "csv", exportedCount },
          }).catch((auditError) => console.error("[game-export] audit failed", auditError));
        } catch (error) {
          console.error("[game-export] stream failed", error);
          if (!request.signal.aborted) controller.error(error);
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${gameExportFilename()}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

import { getBackgroundWorkerHealth, wakeBackgroundWorker } from "@/lib/background-worker-state";
import { hasValidBearerSecret } from "@/lib/security/secret-comparison";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request: Request) {
  if (process.env.BOL_OYUN_PROCESS_ROLE !== "worker"
    || !hasValidBearerSecret(request.headers.get("authorization"), process.env.INTERNAL_HEALTH_CHECK_TOKEN)) {
    return new Response(null, { status: 404 });
  }

  const result = wakeBackgroundWorker();
  if (!result.accepted) {
    return Response.json(
      { status: "unavailable", worker: getBackgroundWorkerHealth() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { status: result.status, worker: getBackgroundWorkerHealth() },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

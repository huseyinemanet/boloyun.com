import { getBackgroundWorkerHealth } from "@/lib/background-worker-state";
import { hasValidBearerSecret } from "@/lib/security/secret-comparison";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  if (!hasValidBearerSecret(request.headers.get("authorization"), process.env.INTERNAL_HEALTH_CHECK_TOKEN)) {
    return new Response(null, { status: 404 });
  }
  const role = process.env.BOL_OYUN_PROCESS_ROLE === "worker" ? "worker" : "web";
  if (role === "worker") {
    const worker = getBackgroundWorkerHealth();
    return Response.json(
      { status: worker.healthy ? "healthy" : "unhealthy", role, worker },
      { status: worker.healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { status: "healthy", role },
    { headers: { "Cache-Control": "no-store" } },
  );
}

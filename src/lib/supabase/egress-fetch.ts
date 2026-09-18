export type EgressMeasurement = {
  event: "supabase_response";
  observedAt: string;
  endpoint: string;
  method: string;
  status: number;
  responseBytes: number;
  durationMs: number;
};

// Counts decoded response bytes without duplicating large responses in memory.
// This is an application estimate, not Supabase's billable network counter.
export function createEgressFetch(
  fetcher: typeof fetch,
  report: (measurement: EgressMeasurement) => void,
): typeof fetch {
  return async (input, init) => {
    const started = performance.now();
    const response = await fetcher(input, init);
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (!url.pathname.startsWith("/rest/v1/")) return response;
    // Only table/RPC names, never query values, credentials, bodies or IDs.
    const endpoint = url.pathname.replace(/^\/rest\/v1\//, "");
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    let responseBytes = 0;
    const finish = () => {
      try {
        report({ event: "supabase_response", observedAt: new Date().toISOString(), endpoint, method, status: response.status, responseBytes, durationMs: Math.round(performance.now() - started) });
      } catch { /* Observability must not interrupt a database response. */ }
    };
    if (!response.body) {
      finish();
      return response;
    }
    const body = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        responseBytes += chunk.byteLength;
        controller.enqueue(chunk);
      },
      flush: finish,
    }));
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}

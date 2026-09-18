import assert from "node:assert/strict";
import test from "node:test";
import { createEgressFetch, type EgressMeasurement } from "./egress-fetch";

test("egress observer preserves JSON and headers and counts UTF-8 bytes without logging filters", async () => {
  const measurements: EgressMeasurement[] = [];
  const body = JSON.stringify({ title: "İki kişilik oyun" });
  const wrapped = createEgressFetch(async () => new Response(body, { headers: { "Content-Range": "0-0/1" } }), (m) => measurements.push(m));
  const response = await wrapped("https://example.supabase.co/rest/v1/games?select=title&secret=private", { headers: { apikey: "secret" } });
  assert.equal(await response.text(), body);
  assert.equal(response.headers.get("Content-Range"), "0-0/1");
  assert.equal(measurements.length, 1);
  assert.equal(measurements[0].responseBytes, Buffer.byteLength(body));
  assert.equal(measurements[0].endpoint, "games");
  assert.doesNotMatch(JSON.stringify(measurements), /secret|private|kişilik/);
});

test("HEAD and error responses remain usable even if the logger fails", async () => {
  const head = createEgressFetch(async () => new Response(null, { status: 200 }), () => { throw new Error("logger failed"); });
  assert.equal((await head("https://example.supabase.co/rest/v1/games", { method: "HEAD" })).status, 200);
  const errors: EgressMeasurement[] = [];
  const failed = createEgressFetch(async () => new Response('{"error":"unavailable"}', { status: 503 }), (m) => errors.push(m));
  const response = await failed("https://example.supabase.co/rest/v1/rpc/search_published_games", { method: "POST" });
  assert.equal((await response.json()).error, "unavailable");
  assert.equal(errors[0].status, 503);
  assert.equal(errors[0].method, "POST");
});

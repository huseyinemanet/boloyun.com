// Local-only integration probe. First build with BOL_OYUN_PREBUILD_FALLBACK=1.
// No production credentials or connections are used.
import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const calls = [];
let authScenario = "rate-unavailable";
const nonce = randomUUID();
const card = { id: randomUUID(), title: "Egress Test Oyunu", slug: `egress-${nonce}`, thumbnail_url: "/logo.svg", game_type: "iframe", status: "published", rating_avg: 4, rating_count: 2, play_count: 10 };
const mock = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  let body = "";
  for await (const part of request) body += part;
  calls.push({ path: url.pathname, method: request.method });
  if (url.pathname.endsWith("/rpc/consume_rate_limit")) {
    response.writeHead(authScenario === "rate-unavailable" ? 503 : 200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(authScenario === "rate-unavailable" ? { message: "Synthetic database outage" } : [{ allowed: authScenario !== "rate-denied", retry_after_seconds: 60 }]));
    return;
  }
  if (url.pathname === "/auth/v1/token") {
    if (authScenario === "auth-network-error") { request.socket.destroy(); return; }
    response.writeHead(authScenario === "auth-unavailable" ? 503 : authScenario === "auth-throttled" ? 429 : 400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: authScenario === "invalid-password" ? "invalid_credentials" : "unexpected_failure", message: "Synthetic auth failure" }));
    return;
  }
  let data = [];
  if (url.pathname.endsWith("/rpc/get_public_game_detail")) {
    const slug = JSON.parse(body).p_slug;
    data = { game: slug.startsWith("missing") ? null : { ...card, slug, short_description: "Yerel ölçüm.", embed_url: "https://example.com/game", is_indexable: true, is_broken: false }, categories: [], tags: [] };
  } else if (url.pathname.endsWith("/rpc/search_published_games")) data = { items: [card], total: 1 };
  else if (url.pathname.endsWith("/rpc/get_public_shell_snapshot")) data = { settings: [], categories: [], ads: [] };
  else if (url.pathname.endsWith("/rpc/get_public_homepage")) data = { sections: [], latest_games: [card] };
  else if (url.pathname.endsWith("/games") || url.pathname.endsWith("/rpc/get_trending_published_games")) data = [card];
  response.writeHead(200, { "Content-Type": "application/json", "Content-Range": "0-0/1" });
  response.end(JSON.stringify(data));
});
await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
const reservation = http.createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const app = spawn(process.execPath, [".next/standalone/server.js"], { env: {
  ...process.env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(port),
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mock.address().port}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-test-anon", SUPABASE_SERVICE_ROLE_KEY: "local-test-service",
  ABUSE_HASH_SECRET: "local-test-only", SUPABASE_EGRESS_LOG: "1",
  SITE_URL: origin, TURNSTILE_SECRET_KEY: "", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  BOL_OYUN_PREBUILD_FALLBACK: "0", BOL_OYUN_PROCESS_ROLE: "web", BACKGROUND_WORKER_ENABLED: "false",
}, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
app.stdout.on("data", (part) => { logs = (logs + part).slice(-20000); });
app.stderr.on("data", (part) => { logs = (logs + part).slice(-20000); });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (app.exitCode !== null) throw new Error(logs);
    // Pure health endpoint, deliberately no catalogue warm-up.
    try { await fetch(`${origin}/api/health`); ready = true; break; } catch { await delay(100); }
  }
  assert.ok(ready, "standalone app must start");
  const results = [];
  for (const route of [`/api/search?q=${nonce}`, `/arama?q=${nonce}`, `/oyun/egress-${nonce}`, `/oyun/missing-${nonce}`, `/sitemaps/games/${Math.floor(Math.random() * 1000) + 10}`]) {
    const samples = [];
    for (let iteration = 0; iteration < 2; iteration += 1) {
      const before = calls.length;
      const response = await fetch(origin + route);
      const body = await response.text();
      samples.push({ status: response.status, bytes: Buffer.byteLength(body), dbRequests: calls.length - before, dbEndpoints: calls.slice(before).map((c) => c.path), nextCache: response.headers.get("x-nextjs-cache"), cacheControl: response.headers.get("cache-control"), notFound: response.status === 404 || body.includes("NEXT_HTTP_ERROR_FALLBACK;404") });
    }
    if (route.includes("missing-")) {
      assert.equal(samples[0].notFound, true);
      assert.deepEqual(samples[0].dbEndpoints.filter((p) => p.includes("game")), ["/rest/v1/rpc/get_public_game_detail"]);
    } else assert.equal(samples[0].status, 200);
    assert.equal(samples[1].dbRequests, 0, `${route}: second request must avoid DB`);
    results.push({ route, samples });
  }
  const authResults = [];
  for (const scenario of ["rate-unavailable", "rate-denied", "auth-unavailable", "auth-network-error", "auth-throttled", "invalid-password"]) {
    authScenario = scenario;
    const before = calls.length;
    const response = await fetch(`${origin}/auth/signin`, {
      method: "POST", redirect: "manual", headers: { Origin: origin },
      body: new URLSearchParams({ email: "probe@example.invalid", password: "synthetic-not-a-user-password", next: "/profil", website: "", form_started_at: String(Date.now() - 2000) }),
    });
    await response.text();
    assert.equal(response.status, 303, scenario);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const location = new URL(response.headers.get("location"));
    assert.equal(location.pathname, "/giris");
    const expectedError = scenario === "invalid-password" ? "invalid" : scenario === "rate-denied" ? "challenge" : "unavailable";
    assert.equal(location.searchParams.get("error"), expectedError, scenario);
    assert.equal(location.searchParams.get("next"), "/profil");
    const endpoints = calls.slice(before).map((c) => c.path);
    if (scenario.startsWith("rate-")) assert.ok(!endpoints.includes("/auth/v1/token"), "rate-limit failure must not bypass login protection");
    assert.ok(!endpoints.some((p) => p.endsWith("/profiles")), "failed login must not provision a profile");
    authResults.push({ scenario, status: response.status, error: expectedError, endpoints });
  }
  const unavailablePage = await fetch(`${origin}/giris?error=unavailable`);
  assert.equal(unavailablePage.status, 200);
  assert.match(await unavailablePage.text(), /Giriş hizmeti geçici olarak kullanılamıyor/);
  console.log(JSON.stringify({ environment: `Node ${process.version}, Next standalone, synthetic local HTTP fixture; not production. Shared cache entries may already be warm.`, results, authResults }, null, 2));
} finally {
  app.kill("SIGTERM");
  if (app.exitCode === null) await new Promise((resolve) => app.once("exit", resolve));
  await new Promise((resolve) => mock.close(resolve));
}

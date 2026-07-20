import assert from "node:assert/strict";
import test from "node:test";
import { notifyAdminOfGameReport } from "./game-report-notification";

const report = { gameTitle: "Deneme Oyunu", gameSlug: "deneme-oyunu", reason: "broken" as const, details: "Siyah ekran." };

test("skips game report email when configuration is incomplete", async () => {
  const result = await notifyAdminOfGameReport(report, { apiKey: "", toEmail: "", fromEmail: "" });
  assert.deepEqual(result, { ok: true, skipped: true, reason: "missing_config" });
});

test("sends a transactional Brevo email with game and admin links", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const result = await notifyAdminOfGameReport(report, {
    apiKey: "test-key",
    toEmail: "admin@example.com",
    fromEmail: "bildirim@example.com",
    siteUrl: "https://boloyun.com/",
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(null, { status: 201 });
    },
  });

  assert.deepEqual(result, { ok: true, skipped: false });
  assert.equal(requests[0]?.url, "https://api.brevo.com/v3/smtp/email");
  const body = JSON.parse(String(requests[0]?.init?.body)) as { subject: string; textContent: string };
  assert.equal(body.subject, "Oyun bildirimi: Deneme Oyunu");
  assert.match(body.textContent, /https:\/\/boloyun\.com\/oyun\/deneme-oyunu/);
  assert.match(body.textContent, /https:\/\/boloyun\.com\/admin\/games\/reports/);
});

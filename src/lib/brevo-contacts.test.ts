import assert from "node:assert/strict";
import test from "node:test";
import { syncBrevoMarketingContact } from "./brevo-contacts";

test("skips Brevo contact sync when configuration is missing", async () => {
  const result = await syncBrevoMarketingContact({ email: "oyuncu@example.com", username: "oyuncu" }, {
    apiKey: "",
    listId: "",
  });

  assert.deepEqual(result, { ok: true, skipped: true, reason: "missing_config" });
});

test("creates or updates Brevo contact in the configured list", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(null, { status: 201 });
  };

  const result = await syncBrevoMarketingContact({ email: "oyuncu@example.com", username: "oyuncu" }, {
    apiKey: "test-key",
    listId: "42",
    fetchImpl,
  });

  assert.deepEqual(result, { ok: true, skipped: false });
  assert.equal(requests.length, 1);
  const [request] = requests;
  assert.equal(request.url, "https://api.brevo.com/v3/contacts");
  assert.equal(request.init?.method, "POST");
  assert.equal((request.init?.headers as Record<string, string>)["api-key"], "test-key");
  assert.deepEqual(JSON.parse(String(request.init?.body)), {
    email: "oyuncu@example.com",
    attributes: {
      FNAME: "oyuncu",
      USERNAME: "oyuncu",
      SOURCE: "boloyun.com",
    },
    listIds: [42],
    updateEnabled: true,
  });
});

test("reports Brevo API errors without throwing", async () => {
  const result = await syncBrevoMarketingContact({ email: "oyuncu@example.com" }, {
    apiKey: "test-key",
    listId: "42",
    fetchImpl: async () => new Response(null, { status: 401 }),
  });

  assert.deepEqual(result, { ok: false, skipped: false, reason: "brevo_401" });
});

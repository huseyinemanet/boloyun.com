import assert from "node:assert/strict";
import test from "node:test";
import type { LookupAddress } from "node:dns";
import type { Dispatcher } from "undici";
import { safeExternalRequest, validateExternalUrl, validateResolvedAddresses } from "./outbound-http";

test("dış URL şema, kimlik bilgisi ve port sınırını zorunlu tutar", () => {
  assert.throws(() => validateExternalUrl("file:///etc/passwd"), /HTTP/);
  assert.throws(() => validateExternalUrl("https://user:pass@example.com/a"), /Kimlik/);
  assert.throws(() => validateExternalUrl("https://example.com:8443/a"), /port/);
  assert.equal(validateExternalUrl("https://example.com/a#x").toString(), "https://example.com/a");
});

test("özel, ayrılmış, mixed ve hexadecimal IPv4-mapped DNS cevapları reddedilir", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.1.1", "100.64.0.1", "192.0.2.1", "::1", "fe80::1", "fc00::1", "::ffff:7f00:1", "2001:db8::1"]) {
    assert.throws(() => validateResolvedAddresses([{ address, family: address.includes(":") ? 6 : 4 }]), /Özel|ayrılmış/, address);
  }
  assert.throws(() => validateResolvedAddresses([
    { address: "93.184.216.34", family: 4 },
    { address: "10.0.0.1", family: 4 },
  ]), /Özel|ayrılmış/);
  assert.deepEqual(validateResolvedAddresses([{ address: "93.184.216.34", family: 4 }]), [{ address: "93.184.216.34", family: 4 }]);
});

test("her hop yalnız doğrulanmış DNS snapshot'ını dispatcher'a verir ve hostname'i korur", async () => {
  const resolved: string[] = [];
  const dispatched: Array<{ hostname: string; addresses: LookupAddress[] }> = [];
  let closed = 0;
  const response = await safeExternalRequest("https://example.com/path", { timeoutMs: 1000, maxResponseBytes: 16 }, {
    resolve: async (hostname) => {
      resolved.push(hostname);
      return [{ address: "93.184.216.34", family: 4 }];
    },
    createDispatcher: (hostname, addresses) => {
      dispatched.push({ hostname, addresses });
      return { close: async () => { closed += 1; } } as unknown as Dispatcher;
    },
    performRequest: async (url, options) => {
      assert.equal(url.hostname, "example.com");
      assert.equal(options.headers["accept-encoding"], "identity");
      return { statusCode: 200, headers: { "content-type": "text/plain" }, body: body([new TextEncoder().encode("ok")]) };
    },
  });
  assert.deepEqual(resolved, ["example.com"]);
  assert.deepEqual(dispatched, [{ hostname: "example.com", addresses: [{ address: "93.184.216.34", family: 4 }] }]);
  assert.equal(new TextDecoder().decode(response.bytes), "ok");
  assert.equal(closed, 1);
});

test("redirect özel adrese ulaşmadan önce tekrar çözülür ve engellenir", async () => {
  let requests = 0;
  await assert.rejects(() => safeExternalRequest("https://public.example/start", { timeoutMs: 1000, maxResponseBytes: 16 }, {
    resolve: async (hostname) => hostname === "public.example"
      ? [{ address: "93.184.216.34", family: 4 }]
      : [{ address: "127.0.0.1", family: 4 }],
    createDispatcher: () => ({ close: async () => undefined }) as unknown as Dispatcher,
    performRequest: async () => {
      requests += 1;
      return { statusCode: 302, headers: { location: "http://localhost/admin" }, body: body([]) };
    },
  }), /Özel|ayrılmış/);
  assert.equal(requests, 1);
});

test("declared ve streamed yanıt boyutu sınırları gövdeyi durdurur", async () => {
  for (const headers of [{ "content-length": "100" }, {}]) {
    let destroyed = false;
    await assert.rejects(() => safeExternalRequest("https://example.com", { timeoutMs: 1000, maxResponseBytes: 3 }, {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      createDispatcher: () => ({ close: async () => undefined }) as unknown as Dispatcher,
      performRequest: async () => ({
        statusCode: 200,
        headers,
        body: body([new Uint8Array([1, 2]), new Uint8Array([3, 4])], () => { destroyed = true; }),
      }),
    }), /sınırını/);
    assert.equal(destroyed, true);
  }
});

test("DNS çözümleme de toplam timeout ve abort sınırına dahildir", async () => {
  await assert.rejects(() => safeExternalRequest("https://example.com", { timeoutMs: 10, maxResponseBytes: 3 }, {
    resolve: async () => await new Promise<LookupAddress[]>(() => undefined),
  }), /timeout|aborted/i);
});

test("sunucu identity talebine rağmen sıkıştırılmış gövde döndürürse reddedilir", async () => {
  let destroyed = false;
  await assert.rejects(() => safeExternalRequest("https://example.com", { timeoutMs: 1000, maxResponseBytes: 100 }, {
    resolve: async () => [{ address: "93.184.216.34", family: 4 }],
    createDispatcher: () => ({ close: async () => undefined }) as unknown as Dispatcher,
    performRequest: async () => ({
      statusCode: 200,
      headers: { "content-encoding": "gzip" },
      body: body([new Uint8Array([1])], () => { destroyed = true; }),
    }),
  }), /Sıkıştırılmış/);
  assert.equal(destroyed, true);
});

function body(chunks: Uint8Array[], onDestroy: () => void = () => undefined) {
  return {
    async *[Symbol.asyncIterator]() { for (const chunk of chunks) yield chunk; },
    destroy() { onDestroy(); },
  };
}

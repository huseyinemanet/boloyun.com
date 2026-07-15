import assert from "node:assert/strict";
import test from "node:test";
import { getRequestOriginFromHeaders, publicUrlFromRequest } from "./request-origin";

test("VPS container origin'i public site URL'ine düşer", () => {
  const previousSiteUrl = process.env.SITE_URL;
  process.env.SITE_URL = "https://boloyun.com";

  try {
    const headers = new Headers({ host: "0.0.0.0:3000" });
    assert.equal(getRequestOriginFromHeaders(headers), "https://boloyun.com");
    assert.equal(publicUrlFromRequest(new Request("http://0.0.0.0:3000/auth/callback", { headers }), "/giris?error=callback").toString(), "https://boloyun.com/giris?error=callback");
  } finally {
    if (previousSiteUrl === undefined) Reflect.deleteProperty(process.env, "SITE_URL");
    else process.env.SITE_URL = previousSiteUrl;
  }
});

test("proxy header'ları public origin üretir", () => {
  const headers = new Headers({
    "x-forwarded-host": "www.boloyun.com",
    "x-forwarded-proto": "https",
  });

  assert.equal(getRequestOriginFromHeaders(headers), "https://www.boloyun.com");
});

test("localhost geliştirme origin'i http kalır", () => {
  assert.equal(getRequestOriginFromHeaders(new Headers({ host: "localhost:3000" })), "http://localhost:3000");
});

import assert from "node:assert/strict";
import test from "node:test";
import { getRequestOriginFromHeaders, hasTrustedMutationOriginFromHeaders, publicUrlFromRequest } from "./request-origin";

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

test("istemci proxy ve origin header'ları public origin'i değiştiremez", () => {
  const previousSiteUrl = process.env.SITE_URL;
  process.env.SITE_URL = "https://boloyun.com";
  const headers = new Headers({
    origin: "https://attacker.example",
    host: "attacker.example",
    "x-forwarded-host": "attacker.example",
    "x-forwarded-proto": "http",
  });

  try {
    assert.equal(getRequestOriginFromHeaders(headers), "https://boloyun.com");
    assert.equal(publicUrlFromRequest(new Request("https://attacker.example/", { headers }), "/auth/callback").origin, "https://boloyun.com");
  } finally {
    if (previousSiteUrl === undefined) Reflect.deleteProperty(process.env, "SITE_URL");
    else process.env.SITE_URL = previousSiteUrl;
  }
});

test("localhost geliştirme origin'i SITE_URL üretimi gösterse bile yerel kalır", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSiteUrl = process.env.SITE_URL;
  Reflect.set(process.env, "NODE_ENV", "development");
  process.env.SITE_URL = "https://boloyun.com";

  try {
    const headers = new Headers({ host: "localhost:3000" });
    assert.equal(getRequestOriginFromHeaders(headers), "http://localhost:3000");
    assert.equal(publicUrlFromRequest(new Request("http://localhost:3000/auth/signin", { headers }), "/giris?error=form").toString(), "http://localhost:3000/giris?error=form");
    assert.equal(hasTrustedMutationOriginFromHeaders(new Headers({ host: "localhost:3000", origin: "http://localhost:3000" })), true);
    assert.equal(hasTrustedMutationOriginFromHeaders(new Headers({ host: "localhost:3000", origin: "https://attacker.example" })), false);
  } finally {
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    if (previousSiteUrl === undefined) Reflect.deleteProperty(process.env, "SITE_URL");
    else process.env.SITE_URL = previousSiteUrl;
  }
});

test("production localhost benzeri istekleri public origin'e taşır", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSiteUrl = process.env.SITE_URL;
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.SITE_URL = "https://boloyun.com";

  try {
    const headers = new Headers({ host: "localhost:3000" });
    assert.equal(getRequestOriginFromHeaders(headers), "https://boloyun.com");
    assert.equal(publicUrlFromRequest(new Request("http://localhost:3000/auth/signin", { headers }), "/giris?error=form").toString(), "https://boloyun.com/giris?error=form");
  } finally {
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    if (previousSiteUrl === undefined) Reflect.deleteProperty(process.env, "SITE_URL");
    else process.env.SITE_URL = previousSiteUrl;
  }
});

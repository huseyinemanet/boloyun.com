import assert from "node:assert/strict";
import test from "node:test";
import { hasTrustedMutationOriginFromHeaders } from "./request-origin";

test("same-origin kontrolünde forwarded host ve Host karar kaynağı değildir", async () => {
  const previousSiteUrl = process.env.SITE_URL;
  process.env.SITE_URL = "https://boloyun.com";

  try {
    assert.equal(hasTrustedMutationOriginFromHeaders(new Headers({
      origin: "https://boloyun.com",
      host: "attacker.example",
      "x-forwarded-host": "attacker.example",
    })), true);
    assert.equal(hasTrustedMutationOriginFromHeaders(new Headers({
      origin: "https://attacker.example",
      host: "attacker.example",
      "x-forwarded-host": "attacker.example",
    })), false);
  } finally {
    if (previousSiteUrl === undefined) Reflect.deleteProperty(process.env, "SITE_URL");
    else process.env.SITE_URL = previousSiteUrl;
  }
});

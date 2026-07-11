import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isCdnConfigured, isR2Configured } from "./system-status";

const keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL"] as const;
const originalValues = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = originalValues[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("system integration status", () => {
  it("reports R2 only when every upload setting is present", () => {
    for (const key of keys) Reflect.deleteProperty(process.env, key);
    process.env.R2_ACCOUNT_ID = "account";
    process.env.R2_ACCESS_KEY_ID = "access";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_BUCKET_NAME = "bucket";

    assert.equal(isR2Configured(), true);
    Reflect.deleteProperty(process.env, "R2_BUCKET_NAME");
    assert.equal(isR2Configured(), false);
  });

  it("reports CDN from the public R2 base URL", () => {
    Reflect.deleteProperty(process.env, "R2_PUBLIC_BASE_URL");
    assert.equal(isCdnConfigured(), false);

    process.env.R2_PUBLIC_BASE_URL = "https://cdn.boloyun.com";
    assert.equal(isCdnConfigured(), true);
  });
});

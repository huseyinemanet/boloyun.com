import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isCdnConfigured, isEmailConfigured, isR2Configured } from "./system-status";

const keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL", "EMAIL_SERVICE_PROVIDER", "EMAIL_FROM_ADDRESS"] as const;
const originalValues = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = originalValues[key];
    if (value === undefined) delete process.env[key];
    else Reflect.set(process.env, key, value);
  }
});

describe("system integration status", () => {
  it("reports R2 only when every upload setting is present", () => {
    for (const key of keys) Reflect.deleteProperty(process.env, key);
    Reflect.set(process.env, "R2_ACCOUNT_ID", "account");
    Reflect.set(process.env, "R2_ACCESS_KEY_ID", "access");
    Reflect.set(process.env, "R2_SECRET_ACCESS_KEY", "secret");
    Reflect.set(process.env, "R2_BUCKET_NAME", "bucket");

    assert.equal(isR2Configured(), true);
    Reflect.deleteProperty(process.env, "R2_BUCKET_NAME");
    assert.equal(isR2Configured(), false);
  });

  it("reports CDN from the public R2 base URL", () => {
    Reflect.deleteProperty(process.env, "R2_PUBLIC_BASE_URL");
    assert.equal(isCdnConfigured(), false);

    Reflect.set(process.env, "R2_PUBLIC_BASE_URL", "https://cdn.boloyun.com");
    assert.equal(isCdnConfigured(), true);
  });

  it("reports email only for the configured Brevo sender on boloyun.com", () => {
    Reflect.deleteProperty(process.env, "EMAIL_SERVICE_PROVIDER");
    Reflect.deleteProperty(process.env, "EMAIL_FROM_ADDRESS");
    assert.equal(isEmailConfigured(), false);

    Reflect.set(process.env, "EMAIL_SERVICE_PROVIDER", "brevo");
    assert.equal(isEmailConfigured(), false);

    Reflect.set(process.env, "EMAIL_FROM_ADDRESS", "noreply@example.com");
    assert.equal(isEmailConfigured(), false);

    Reflect.set(process.env, "EMAIL_FROM_ADDRESS", "noreply@boloyun.com");
    assert.equal(isEmailConfigured(), true);
  });
});

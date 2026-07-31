import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("requireAdmin aal2 doğrulamasını zorunlu tutar", () => {
  const auth = readFileSync(path.join(process.cwd(), "src/lib/auth.ts"), "utf8");

  assert.match(auth, /getAuthenticatorAssuranceLevel/);
  assert.match(auth, /isAdminMfaSatisfied/);
  assert.match(auth, /adminMfaPath/);
});

test("admin MFA ekranı TOTP kurulum ve doğrulama akışını içerir", () => {
  const form = readFileSync(path.join(process.cwd(), "src/app/(auth)/hesap-guvenligi/admin-mfa-form.tsx"), "utf8");

  assert.match(form, /mfa\.enroll/);
  assert.match(form, /factorType: "totp"/);
  assert.match(form, /mfa\.challengeAndVerify/);
  assert.match(form, /<InputOTP/);
  assert.match(form, /REGEXP_ONLY_DIGITS/);
  assert.match(form, /maxLength=\{6\}/);
  assert.doesNotMatch(form, /<Input\s/);
  assert.doesNotMatch(form, /dangerouslySetInnerHTML/);
});

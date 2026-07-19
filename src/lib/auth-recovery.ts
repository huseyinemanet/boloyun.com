import { createHmac, timingSafeEqual } from "node:crypto";

export const PASSWORD_RECOVERY_COOKIE = "password_recovery_pending";
export const PASSWORD_RECOVERY_MAX_AGE_SECONDS = 15 * 60;
export const PASSWORD_RECOVERY_INTENT_MAX_AGE_SECONDS = 60 * 60;

export function createPasswordRecoveryCookieValue(userId: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + PASSWORD_RECOVERY_MAX_AGE_SECONDS;
  return `${expiresAt}.${recoverySignature(userId, expiresAt)}`;
}

export function hasValidPasswordRecoveryCookie(value: string | null | undefined, userId: string, now = Date.now()) {
  if (!value || !userId) return false;
  const [expiresValue, suppliedSignature, extra] = value.split(".");
  if (extra !== undefined || !expiresValue || !suppliedSignature || !/^\d+$/.test(expiresValue)) return false;

  const expiresAt = Number(expiresValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(now / 1000)) return false;
  if (expiresAt > Math.floor(now / 1000) + PASSWORD_RECOVERY_MAX_AGE_SECONDS) return false;

  const expected = Buffer.from(recoverySignature(userId, expiresAt), "hex");
  const supplied = Buffer.from(suppliedSignature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createPasswordRecoveryIntent(email: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + PASSWORD_RECOVERY_INTENT_MAX_AGE_SECONDS;
  return `${expiresAt}.${recoveryIntentSignature(normalizeEmail(email), expiresAt)}`;
}

export function hasValidPasswordRecoveryIntent(value: string | null | undefined, email: string, now = Date.now()) {
  if (!value || !email) return false;
  const [expiresValue, suppliedSignature, extra] = value.split(".");
  if (extra !== undefined || !expiresValue || !suppliedSignature || !/^\d+$/.test(expiresValue)) return false;

  const expiresAt = Number(expiresValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(now / 1000)) return false;
  if (expiresAt > Math.floor(now / 1000) + PASSWORD_RECOVERY_INTENT_MAX_AGE_SECONDS) return false;

  const expected = Buffer.from(recoveryIntentSignature(normalizeEmail(email), expiresAt), "hex");
  const supplied = Buffer.from(suppliedSignature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function recoverySignature(userId: string, expiresAt: number) {
  const secret = process.env.ABUSE_HASH_SECRET;
  if (!secret) return "";
  return createHmac("sha256", secret).update(`${userId}:${expiresAt}`).digest("hex");
}

function recoveryIntentSignature(email: string, expiresAt: number) {
  const secret = process.env.ABUSE_HASH_SECRET;
  if (!secret) return "";
  return createHmac("sha256", secret).update(`password-recovery:${email}:${expiresAt}`).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

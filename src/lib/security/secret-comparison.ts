import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidBearerSecret(authorization: string | null, secret: string | undefined) {
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  const suppliedDigest = createHash("sha256").update(supplied).digest();
  const expectedDigest = createHash("sha256").update(secret).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

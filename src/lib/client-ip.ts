import { isIP } from "node:net";

export function getTrustedClientIpFromHeaders(headerStore: Pick<Headers, "get">, isProduction = process.env.NODE_ENV === "production") {
  const realIp = normalizeIp(headerStore.get("x-real-ip"));
  if (realIp !== "unknown" || isProduction) return realIp;

  return normalizeIp(headerStore.get("x-forwarded-for")?.split(",")[0] ?? null);
}

function normalizeIp(value: string | null) {
  const candidate = value?.trim() ?? "";
  return isIP(candidate) ? candidate : "unknown";
}

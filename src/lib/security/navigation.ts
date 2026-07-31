export function safeLocalPath(value: unknown, fallback = "/") {
  const path = String(value ?? fallback).trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) return fallback;
  return path;
}

export function safeOAuthPath(value: unknown, fallback = "/") {
  const path = safeLocalPath(value, fallback);
  return path.split("?", 1)[0] === "/sifre-yenile" ? fallback : path;
}

export function buildOAuthCallbackUrl(origin: string, next: string) {
  const callbackUrl = new URL("/auth/callback", origin);
  if (next !== "/") callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}

export function safeLocalPath(value: unknown, fallback = "/") {
  const path = String(value ?? fallback).trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) return fallback;
  return path;
}

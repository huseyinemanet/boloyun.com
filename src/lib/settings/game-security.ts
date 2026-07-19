import type { SecuritySettings } from "@/lib/settings/types";

export function isGameSourceAllowed(source: string | null | undefined, security: SecuritySettings) {
  if (!source) return false;
  let url: URL;
  try { url = new URL(source); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return false;
  if (!security.enforceIframeAllowlist) return true;
  const hostname = url.hostname.toLocaleLowerCase("tr-TR");
  return security.iframeAllowlist.some((allowed) => allowed.startsWith("*.") ? hostname === allowed.slice(2) || hostname.endsWith(`.${allowed.slice(2)}`) : hostname === allowed);
}

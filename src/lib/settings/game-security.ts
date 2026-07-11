import type { SecuritySettings } from "@/lib/settings/types";

export function isGameSourceAllowed(source: string | null | undefined, security: SecuritySettings) {
  if (!security.enforceIframeAllowlist || !source) return true;
  let hostname: string;
  try { hostname = new URL(source).hostname.toLocaleLowerCase("tr-TR"); } catch { return false; }
  return security.iframeAllowlist.some((allowed) => allowed.startsWith("*.") ? hostname === allowed.slice(2) || hostname.endsWith(`.${allowed.slice(2)}`) : hostname === allowed);
}

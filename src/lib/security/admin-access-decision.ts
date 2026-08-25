import type { CurrentProfile } from "@/lib/auth";

export type AdminAccessDecision =
  | { allowed: true; admin: CurrentProfile }
  | { allowed: false; reason: "unauthenticated" | "forbidden" | "mfa_required" | "auth_unavailable" };

export function classifyAdminAccess(
  profile: CurrentProfile | null,
  identityUnavailable: boolean,
  assurance: "aal1" | "aal2" | "unavailable" = "unavailable",
): AdminAccessDecision {
  if (identityUnavailable) return { allowed: false, reason: "auth_unavailable" };
  if (!profile) return { allowed: false, reason: "unauthenticated" };
  if (profile.role !== "admin" || profile.status !== "active") return { allowed: false, reason: "forbidden" };
  if (assurance === "unavailable") return { allowed: false, reason: "auth_unavailable" };
  if (assurance !== "aal2") return { allowed: false, reason: "mfa_required" };
  return { allowed: true, admin: profile };
}

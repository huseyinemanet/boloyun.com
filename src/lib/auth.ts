import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { normalizeSiteAssetUrl } from "@/lib/site-assets";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminMfaPath, isAdminMfaSatisfied } from "@/lib/security/admin-mfa";
import { classifyAdminAccess, type AdminAccessDecision } from "@/lib/security/admin-access-decision";

export { classifyAdminAccess, type AdminAccessDecision } from "@/lib/security/admin-access-decision";

export type UserRole = "admin" | "member";
export type UserStatus = "active" | "blocked";

export type CurrentProfile = {
  id: string;
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
};

type ProfileRow = {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: UserRole | null;
  status: UserStatus | null;
};

type CurrentProfileResult =
  | { status: "authenticated"; profile: CurrentProfile }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

const getCurrentProfileResult = cache(async function getCurrentProfileResult(): Promise<CurrentProfileResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { status: "unavailable" };

    const { data: userResult, error: userError } = await supabase.auth.getUser();
    const user = userResult.user;
    if (!user?.id) {
      return userError && userError.name !== "AuthSessionMissingError"
        ? { status: "unavailable" }
        : { status: "unauthenticated" };
    }

    const service = createSupabaseServiceClient();
    if (!service) return { status: "unavailable" };

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("id, user_id, username, avatar_url, first_name, last_name, display_name, role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[auth] current profile query failed", toLogError(profileError));
      return { status: "unavailable" };
    }
    if (!profile) return { status: "unauthenticated" };

    const row = profile as ProfileRow;
    return {
      status: "authenticated",
      profile: {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        email: user.email ?? "",
        avatarUrl: normalizeSiteAssetUrl(row.avatar_url),
        firstName: row.first_name,
        lastName: row.last_name,
        displayName: row.display_name,
        role: row.role ?? "member",
        status: row.status ?? "active",
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[auth] current profile could not be read", toLogError(error));
    return { status: "unavailable" };
  }
});

export const getCurrentProfile = cache(async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const result = await getCurrentProfileResult();
  return result.status === "authenticated" ? result.profile : null;
});

export async function evaluateAdminAccess(): Promise<AdminAccessDecision> {
  const result = await getCurrentProfileResult();
  if (result.status === "unauthenticated") return classifyAdminAccess(null, false);
  if (result.status === "unavailable") return classifyAdminAccess(null, true);

  const profile = result.profile;
  if (profile.role !== "admin" || profile.status !== "active") return classifyAdminAccess(profile, false);

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return classifyAdminAccess(profile, false, "unavailable");
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      console.error("[auth] admin assurance level could not be read", toLogError(error));
      return classifyAdminAccess(profile, false, "unavailable");
    }
    return classifyAdminAccess(profile, false, isAdminMfaSatisfied(data?.currentLevel) ? "aal2" : "aal1");
  } catch (error) {
    unstable_rethrow(error);
    console.error("[auth] admin assurance level check failed", toLogError(error));
    return classifyAdminAccess(profile, false, "unavailable");
  }
}

function toLogError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris");
  if (profile.status === "blocked") redirect("/giris?error=blocked");
  return profile;
}

export async function requireAdmin() {
  const decision = await evaluateAdminAccess();
  if (decision.allowed) return decision.admin;
  if (decision.reason === "mfa_required") redirect(adminMfaPath());
  if (decision.reason === "auth_unavailable") redirect("/giris?error=config&next=/admin");
  redirect("/giris?next=/admin");
}

export function getDisplayName(profile: Pick<CurrentProfile, "displayName" | "firstName" | "lastName" | "username">) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return profile.displayName || fullName || profile.username;
}

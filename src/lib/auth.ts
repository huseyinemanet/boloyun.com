import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { normalizeSiteAssetUrl } from "@/lib/site-assets";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export const getCurrentProfile = cache(async function getCurrentProfile(): Promise<CurrentProfile | null> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const { data: userResult } = await supabase.auth.getUser();
    const user = userResult.user;
    if (!user?.id) return null;

    const service = createSupabaseServiceClient();
    if (!service) return null;

    const { data: profile } = await service
      .from("profiles")
      .select("id, user_id, username, avatar_url, first_name, last_name, display_name, role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return null;

    const row = profile as ProfileRow;
    return {
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
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[auth] current profile could not be read", toLogError(error));
    return null;
  }
});

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
  const profile = await getCurrentProfile();
  if (profile?.role === "admin" && profile.status === "active") return profile;

  redirect("/giris?next=/admin");
}

export function getDisplayName(profile: Pick<CurrentProfile, "displayName" | "firstName" | "lastName" | "username">) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return profile.displayName || fullName || profile.username;
}

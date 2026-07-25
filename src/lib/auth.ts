import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveViewerProfile,
  type CurrentProfile,
  type CurrentProfileResult,
} from "@/lib/auth-viewer";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type { CurrentProfile, CurrentProfileResult, UserRole, UserStatus } from "@/lib/auth-viewer";

export const getCurrentProfile = cache(async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const result = await resolveCurrentProfile();
  return result.profile;
});

export async function resolveCurrentProfile(): Promise<CurrentProfileResult> {
  return resolveCurrentProfileForClient(await createSupabaseServerClient());
}

export async function resolveCurrentProfileForClient(
  supabase: SupabaseClient | null,
): Promise<CurrentProfileResult> {
  if (!supabase) {
    return { status: "unavailable", profile: null, reason: "configuration" };
  }

  try {
    return await resolveViewerProfile({
      async getUser() {
        const { data, error } = await supabase.auth.getUser();
        return { user: data.user, error };
      },
      async getProfile(userId) {
        const service = createSupabaseServiceClient();
        if (!service) {
          return { profile: null, error: new Error("Supabase service client is unavailable.") };
        }

        const { data, error } = await service
          .from("profiles")
          .select("id, user_id, username, avatar_url, first_name, last_name, display_name, role, status")
          .eq("user_id", userId)
          .maybeSingle();

        return { profile: data, error };
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[auth] current profile could not be read", toLogError(error));
    return { status: "unavailable", profile: null, reason: "auth" };
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
  const profile = await getCurrentProfile();
  if (profile?.role === "admin" && profile.status === "active") return profile;

  redirect("/giris?next=/admin");
}

export function getDisplayName(profile: Pick<CurrentProfile, "displayName" | "firstName" | "lastName" | "username">) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return profile.displayName || fullName || profile.username;
}

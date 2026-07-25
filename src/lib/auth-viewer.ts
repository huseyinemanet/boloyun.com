import { normalizeSiteAssetUrl } from "@/lib/site-assets";
import { isAuthSessionMissingError } from "@supabase/supabase-js";

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

export type CurrentProfileResult =
  | { status: "authenticated"; profile: CurrentProfile }
  | { status: "anonymous"; profile: null }
  | { status: "unavailable"; profile: null; reason: "configuration" | "auth" | "profile" };

type AuthUser = {
  id: string;
  email?: string | null;
};

export type ProfileRow = {
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

type ViewerProfileDependencies = {
  getUser: () => Promise<{ user: AuthUser | null; error: unknown | null }>;
  getProfile: (userId: string) => Promise<{ profile: ProfileRow | null; error: unknown | null }>;
};

export async function resolveViewerProfile({
  getUser,
  getProfile,
}: ViewerProfileDependencies): Promise<CurrentProfileResult> {
  let userResult: Awaited<ReturnType<ViewerProfileDependencies["getUser"]>>;
  try {
    userResult = await getUser();
  } catch {
    return { status: "unavailable", profile: null, reason: "auth" };
  }

  if (userResult.error && !isAuthSessionMissingError(userResult.error)) {
    return { status: "unavailable", profile: null, reason: "auth" };
  }
  if (!userResult.user?.id) {
    return { status: "anonymous", profile: null };
  }

  let profileResult: Awaited<ReturnType<ViewerProfileDependencies["getProfile"]>>;
  try {
    profileResult = await getProfile(userResult.user.id);
  } catch {
    return { status: "unavailable", profile: null, reason: "profile" };
  }

  if (profileResult.error || !profileResult.profile) {
    return { status: "unavailable", profile: null, reason: "profile" };
  }

  const row = profileResult.profile;
  return {
    status: "authenticated",
    profile: {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      email: userResult.user.email ?? "",
      avatarUrl: normalizeSiteAssetUrl(row.avatar_url),
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      role: row.role ?? "member",
      status: row.status ?? "active",
    },
  };
}

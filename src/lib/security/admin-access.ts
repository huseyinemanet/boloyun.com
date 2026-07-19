export type AdminAccessProfile = {
  role?: string | null;
  status?: string | null;
};

export function isActiveAdminProfile(profile: AdminAccessProfile | null | undefined) {
  return profile?.role === "admin" && profile.status === "active";
}

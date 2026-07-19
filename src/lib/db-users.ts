import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { createPasswordRecoveryIntent } from "@/lib/auth-recovery";
import type { UserRole, UserStatus } from "@/lib/auth";

export type AdminUserFilter = "all" | "admin" | "member" | "blocked";

export type AdminUser = {
  id: string;
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  bio: string | null;
  website: string | null;
  role: UserRole;
  status: UserStatus;
  commentCount: number;
  favoriteCount: number;
  createdAt: string;
};

export type AdminUserCounts = Record<AdminUserFilter, number>;

type ProfileRow = {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  website: string | null;
  role: UserRole | null;
  status: UserStatus | null;
  created_at: string | null;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  return getAdminUsersPage({ page: 1, perPage: 100, filter: "all" }).then((result) => result.items);
}

export async function getAdminUsersPage({ page, perPage, filter }: { page: number; perPage: number; filter: AdminUserFilter }): Promise<{ items: AdminUser[]; total: number }> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { items: [], total: 0 };

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("profiles")
    .select("id, user_id, username, avatar_url, first_name, last_name, display_name, bio, website, role, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filter === "blocked") query = query.eq("status", "blocked");
  else if (filter === "admin" || filter === "member") query = query.eq("role", filter).neq("status", "blocked");
  const { data: profiles, error, count } = await query;
  if (error) throw new Error(`Kullanıcılar okunamadı: ${error.message}`);
  const profileRows = (profiles ?? []) as ProfileRow[];
  const [usersResult, engagementResult] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.rpc("get_profile_engagement_counts", { p_profile_ids: profileRows.map((profile) => profile.id) }),
  ]);
  if (usersResult.error) throw new Error(`Auth kullanıcıları okunamadı: ${usersResult.error.message}`);
  if (engagementResult.error) throw new Error(`Kullanıcı istatistikleri okunamadı: ${engagementResult.error.message}`);

  const usersById = new Map((usersResult.data.users as User[]).map((user) => [user.id, user]));
  const engagement = new Map(((engagementResult.data ?? []) as Array<{ profile_id: string; comment_count: number; favorite_count: number }>).map((row) => [row.profile_id, row]));

  const items = profileRows.map((profile) => {
    const authUser = usersById.get(profile.user_id);
    const counts = engagement.get(profile.id);
    return mapAdminUser(profile, authUser, Number(counts?.comment_count ?? 0), Number(counts?.favorite_count ?? 0));
  });
  return { items, total: count ?? 0 };
}

export async function getAdminUserByProfileId(id: string): Promise<AdminUser | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, user_id, username, avatar_url, first_name, last_name, display_name, bio, website, role, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!profile) return null;

  const userResult = await supabase.auth.admin.getUserById((profile as ProfileRow).user_id);
  const [{ count: commentCount }, { count: favoriteCount }] = await Promise.all([
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("favorites").select("game_id", { count: "exact", head: true }).eq("user_id", id),
  ]);

  return mapAdminUser(profile as ProfileRow, userResult.data.user ?? undefined, commentCount ?? 0, favoriteCount ?? 0);
}

export async function getAdminUserCounts(): Promise<AdminUserCounts> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { all: 0, admin: 0, member: 0, blocked: 0 };
  const [all, admin, member, blocked] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").neq("status", "blocked"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member").neq("status", "blocked"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "blocked"),
  ]);
  return {
    all: all.count ?? 0,
    admin: admin.count ?? 0,
    member: member.count ?? 0,
    blocked: blocked.count ?? 0,
  };
}

export async function getUsersCount(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Kullanici sayisi okunamadi: ${error.message}`);
  }

  return count ?? 0;
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserRole;
}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username: input.username,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: input.displayName || input.username,
      terms_accepted: true,
    },
  });

  if (error || !data.user) {
    throw new Error(`Kullanıcı oluşturulamadı: ${error?.message ?? "kayıt bulunamadı"}`);
  }

  try {
    await upsertProfileForAuthUser(data.user.id, {
      username: input.username,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: input.displayName || input.username,
      role: input.role,
      status: "active",
      terms_accepted_at: new Date().toISOString(),
    });
  } catch (profileError) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(data.user.id);
    if (cleanupError) throw new Error(`Profil oluşturulamadı ve Auth kaydı temizlenemedi: ${cleanupError.message}`);
    throw profileError;
  }

  return data.user.id;
}

export async function updateAdminUser(profileId: string, input: {
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
  website: string;
  avatarUrl: string;
  role: UserRole;
  status: UserStatus;
}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const existing = await getAdminUserByProfileId(profileId);
  if (!existing) throw new Error("Kullanıcı bulunamadı.");

  const emailChanged = Boolean(input.email && input.email !== existing.email);
  if (emailChanged) {
    const { error: authError } = await supabase.auth.admin.updateUserById(existing.userId, {
      email: input.email,
      email_confirm: true,
    });
    if (authError) throw new Error(`E-posta güncellenemedi: ${authError.message}`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: input.displayName,
      bio: input.bio,
      website: input.website,
      avatar_url: input.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    if (emailChanged) await supabase.auth.admin.updateUserById(existing.userId, { email: existing.email, email_confirm: true });
    throw new Error(`Kullanıcı güncellenemedi: ${error.message}`);
  }
  await updateAdminProfilesAtomic([profileId], input.role, input.status);
}

export async function updateAdminUsersStatus(ids: string[], status: UserStatus) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  if (!ids.length) return;

  await updateAdminProfilesAtomic(ids, null, status);
}

export async function updateAdminUsersRole(ids: string[], role: UserRole) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  if (!ids.length) return;

  await updateAdminProfilesAtomic(ids, role, null);
}

export async function deleteAdminUsers(ids: string[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  if (!ids.length) return;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, user_id, role, status")
    .in("id", ids);

  if (error) throw new Error(`Kullanıcılar okunamadı: ${error.message}`);

  const rows = (profiles ?? []) as Array<{ id: string; user_id: string; role: UserRole; status: UserStatus }>;
  await updateAdminProfilesAtomic(rows.map((profile) => profile.id), null, "blocked");
  const failures: string[] = [];
  for (const profile of rows) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.user_id);
    if (deleteError) {
      failures.push(profile.id);
      await updateAdminProfilesAtomic([profile.id], profile.role, profile.status);
    }
  }
  if (failures.length) throw new Error(`${failures.length} kullanıcı silinemedi; hesap durumları geri alındı.`);
}

export async function sendAdminPasswordReset(email: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const recoveryIntent = createPasswordRecoveryIntent(email);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.SITE_URL || "http://localhost:3000"}/auth/callback?next=/sifre-yenile&recovery=${encodeURIComponent(recoveryIntent)}`,
  });

  if (error) throw new Error(`Şifre sıfırlama e-postası gönderilemedi: ${error.message}`);
}

export async function countActiveAdmins(exceptProfileIds: string[] = []) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  let query = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active");

  if (exceptProfileIds.length) {
    query = query.not("id", "in", `(${exceptProfileIds.join(",")})`);
  }

  const { count } = await query;
  return count ?? 0;
}

async function updateAdminProfilesAtomic(ids: string[], role: UserRole | null, status: UserStatus | null) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { error } = await supabase.rpc("update_admin_profiles_atomic", {
    p_profile_ids: ids,
    p_role: role,
    p_status: status,
  });
  if (error) throw new Error(error.message.includes("last active admin") ? "Son aktif yönetici kaldırılamaz." : `Kullanıcı yetkisi güncellenemedi: ${error.message}`);
}

async function upsertProfileForAuthUser(userId: string, values: Record<string, string>) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { error } = await supabase
    .from("profiles")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) throw new Error(`Profil güncellenemedi: ${error.message}`);
}

function mapAdminUser(profile: ProfileRow, authUser: User | undefined, commentCount: number, favoriteCount: number): AdminUser {
  return {
    id: profile.id,
    userId: profile.user_id,
    username: profile.username,
    email: authUser?.email ?? "",
    avatarUrl: profile.avatar_url,
    firstName: profile.first_name,
    lastName: profile.last_name,
    displayName: profile.display_name,
    bio: profile.bio,
    website: profile.website,
    role: profile.role ?? "member",
    status: profile.status ?? "active",
    commentCount,
    favoriteCount,
    createdAt: profile.created_at ?? new Date().toISOString(),
  };
}

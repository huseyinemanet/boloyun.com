import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function ensureProfileForAuthUser(user: User, options: {
  username?: string;
  termsAccepted?: boolean;
  marketingEmailsAccepted?: boolean;
  birthYear?: number | null;
} = {}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    throw new Error(`Profil okunamadı: ${readError.message}`);
  }

  if (existing) return (existing as { id: string }).id;

  const metadata = user.user_metadata ?? {};
  const baseUsername = normalizeUsername(
    options.username ||
    stringValue(metadata.username) ||
    stringValue(metadata.preferred_username) ||
    user.email?.split("@")[0] ||
    "oyuncu",
  );
  const username = await getAvailableUsername(baseUsername, user.id);
  const displayName = stringValue(metadata.display_name) || stringValue(metadata.full_name) || stringValue(metadata.name) || username;

  const profileInput = {
    user_id: user.id,
    username,
    avatar_url: stringValue(metadata.avatar_url) || stringValue(metadata.picture) || null,
    first_name: stringValue(metadata.first_name) || null,
    last_name: stringValue(metadata.last_name) || null,
    display_name: displayName,
    role: "member",
    status: "active",
    terms_accepted_at: options.termsAccepted ? new Date().toISOString() : null,
    marketing_emails_accepted: Boolean(options.marketingEmailsAccepted),
    birth_year: options.birthYear ?? null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(profileInput)
    .select("id")
    .single();

  if (insertError) {
    const fallbackId = await insertLegacyProfileIfNeeded(user.id, {
      username,
      avatarUrl: profileInput.avatar_url,
      termsAccepted: options.termsAccepted,
      marketingEmailsAccepted: options.marketingEmailsAccepted,
    }, insertError.message);
    if (fallbackId) return fallbackId;

    throw new Error(`Profil oluşturulamadı: ${insertError.message}`);
  }

  return (inserted as { id: string }).id;
}

function normalizeUsername(value: string) {
  const normalized = value
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  const base = normalized || "oyuncu";
  return base.length > 29 ? base.slice(0, 29) : base;
}

async function getAvailableUsername(baseUsername: string, userId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return baseUsername;

  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", baseUsername)
    .maybeSingle();

  if (!data || (data as { user_id?: string }).user_id === userId) {
    return baseUsername;
  }

  const suffix = userId.slice(0, 8);
  return `${baseUsername.slice(0, Math.max(1, 20))}-${suffix}`;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

async function insertLegacyProfileIfNeeded(userId: string, input: {
  username: string;
  avatarUrl: string | null;
  termsAccepted?: boolean;
  marketingEmailsAccepted?: boolean;
}, errorMessage: string) {
  if (!errorMessage.includes("schema cache")) return null;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      username: input.username,
      avatar_url: input.avatarUrl,
      terms_accepted_at: input.termsAccepted ? new Date().toISOString() : null,
      marketing_emails_accepted: Boolean(input.marketingEmailsAccepted),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Profil oluşturulamadı: ${error.message}`);
  }

  return (data as { id: string }).id;
}

import assert from "node:assert/strict";
import test from "node:test";
import { AuthSessionMissingError } from "@supabase/supabase-js";
import { resolveViewerProfile, type ProfileRow } from "./auth-viewer";

const profileRow: ProfileRow = {
  id: "profile-id",
  user_id: "user-id",
  username: "oyuncu",
  avatar_url: null,
  first_name: "Oyun",
  last_name: "Sever",
  display_name: null,
  role: "member",
  status: "active",
};

test("geçerli kullanıcı ve profil authenticated döner", async () => {
  const result = await resolveViewerProfile({
    getUser: async () => ({ user: { id: "user-id", email: "oyuncu@example.com" }, error: null }),
    getProfile: async () => ({ profile: profileRow, error: null }),
  });

  assert.equal(result.status, "authenticated");
  assert.equal(result.profile?.id, "profile-id");
  assert.equal(result.profile?.email, "oyuncu@example.com");
});

test("hatasız kullanıcısız sonuç anonymous döner", async () => {
  let profileRead = false;
  const result = await resolveViewerProfile({
    getUser: async () => ({ user: null, error: null }),
    getProfile: async () => {
      profileRead = true;
      return { profile: null, error: null };
    },
  });

  assert.deepEqual(result, { status: "anonymous", profile: null });
  assert.equal(profileRead, false);
});

test("Supabase oturum yok hatası gerçek anonymous ziyaretçi sayılır", async () => {
  const result = await resolveViewerProfile({
    getUser: async () => ({ user: null, error: new AuthSessionMissingError() }),
    getProfile: async () => ({ profile: null, error: null }),
  });

  assert.deepEqual(result, { status: "anonymous", profile: null });
});

test("auth hatası anonymous yerine unavailable döner", async () => {
  const result = await resolveViewerProfile({
    getUser: async () => ({ user: null, error: new Error("auth unavailable") }),
    getProfile: async () => ({ profile: null, error: null }),
  });

  assert.deepEqual(result, { status: "unavailable", profile: null, reason: "auth" });
});

test("profil sorgu hatası ve eksik profil unavailable döner", async () => {
  const errored = await resolveViewerProfile({
    getUser: async () => ({ user: { id: "user-id" }, error: null }),
    getProfile: async () => ({ profile: null, error: new Error("profile unavailable") }),
  });
  const missing = await resolveViewerProfile({
    getUser: async () => ({ user: { id: "user-id" }, error: null }),
    getProfile: async () => ({ profile: null, error: null }),
  });

  assert.deepEqual(errored, { status: "unavailable", profile: null, reason: "profile" });
  assert.deepEqual(missing, { status: "unavailable", profile: null, reason: "profile" });
});

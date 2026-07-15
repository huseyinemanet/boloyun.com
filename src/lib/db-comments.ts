import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { measuredQuery } from "@/lib/query-observability";

export type GameComment = {
  id: string;
  body: string;
  createdAt: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  likesCount: number;
};

export type AdminComment = GameComment & {
  status: string;
  userRole: string;
  email: string;
  gameTitle: string;
  gameSlug: string;
};

export type AdminCommentFilter = "all" | "pending" | "approved" | "spam" | "trash";

export type AdminCommentCounts = Record<AdminCommentFilter, number>;

type CommentRow = {
  id: string;
  body: string;
  created_at: string | null;
  likes_count?: number | null;
  status?: string | null;
  profiles?:
    | { user_id?: string | null; username?: string | null; avatar_url?: string | null; first_name?: string | null; last_name?: string | null; display_name?: string | null; role?: string | null }
    | { user_id?: string | null; username?: string | null; avatar_url?: string | null; first_name?: string | null; last_name?: string | null; display_name?: string | null; role?: string | null }[]
    | null;
  games?: { title?: string | null; slug?: string | null } | { title?: string | null; slug?: string | null }[] | null;
};

const getApprovedCommentsForGameCached = unstable_cache(async function getApprovedCommentsForGame(gameId: string, limit = 20): Promise<GameComment[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await measuredQuery("comments.approved.latest", supabase
    .from("comments")
    .select("id, body, likes_count, created_at, profiles(username, avatar_url, first_name, last_name, display_name)")
    .eq("game_id", gameId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit));

  if (error || !data) return [];

  return (data as unknown as CommentRow[]).map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.created_at ?? new Date().toISOString(),
    username: getProfile(comment.profiles).username,
    displayName: getProfile(comment.profiles).displayName,
    avatarUrl: getProfile(comment.profiles).avatarUrl,
    likesCount: comment.likes_count ?? 0,
  }));
}, ["approved-comments-for-game-v1"], { revalidate: 3600, tags: ["comments"] });
export const getApprovedCommentsForGame = cache(async function getApprovedCommentsForGame(gameId: string, limit = 20): Promise<GameComment[]> {
  return getApprovedCommentsForGameCached(gameId, limit);
});

const getTopCommentsForGameCached = unstable_cache(async function getTopCommentsForGame(gameId: string, limit = 5): Promise<GameComment[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await measuredQuery("comments.approved.top", supabase
    .from("comments")
    .select("id, body, likes_count, created_at, profiles(username, avatar_url, first_name, last_name, display_name)")
    .eq("game_id", gameId)
    .eq("status", "approved")
    .order("likes_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit));

  if (error || !data) return [];

  return (data as unknown as CommentRow[]).map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.created_at ?? new Date().toISOString(),
    username: getProfile(comment.profiles).username,
    displayName: getProfile(comment.profiles).displayName,
    avatarUrl: getProfile(comment.profiles).avatarUrl,
    likesCount: comment.likes_count ?? 0,
  }));
}, ["top-comments-for-game-v1"], { revalidate: 3600, tags: ["comments"] });
export const getTopCommentsForGame = cache(async function getTopCommentsForGame(gameId: string, limit = 5): Promise<GameComment[]> {
  return getTopCommentsForGameCached(gameId, limit);
});

export async function createPendingComment(gameId: string, body: string, userId: string, status: "pending" | "approved" = "pending", dailyLimit = 20) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { error } = await supabase.rpc("create_comment_atomic", {
    p_game_id: gameId,
    p_profile_id: userId,
    p_body: body,
    p_status: status,
    p_daily_limit: dailyLimit,
  });
  if (error) throw new Error(`Yorum kaydedilemedi: ${error.message}`);
}

export async function getUserCommentsSince(userId: string, since: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;
  const { count, error } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  if (error) throw new Error(`Yorum limiti kontrol edilemedi: ${error.message}`);
  return count ?? 0;
}

export async function getAdminComments(limit = 100): Promise<AdminComment[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("comments")
    .select("id, body, status, created_at, profiles(user_id, username, avatar_url, first_name, last_name, display_name, role), games(title, slug)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const usersResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailsByUserId = new Map((usersResult.data.users as User[]).map((user) => [user.id, user.email ?? ""]));

  return (data as unknown as CommentRow[]).map((comment) => {
    const game = getGame(comment.games);
    const profile = getProfile(comment.profiles);

    return {
      id: comment.id,
      body: comment.body,
      status: comment.status ?? "pending",
      createdAt: comment.created_at ?? new Date().toISOString(),
      likesCount: comment.likes_count ?? 0,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      userRole: profile.role,
      email: profile.userId ? emailsByUserId.get(profile.userId) || "" : "",
      gameTitle: game.title,
      gameSlug: game.slug,
    };
  });
}

export async function getAdminCommentCounts(): Promise<AdminCommentCounts> {
  const comments = await getAdminComments(1000);

  return {
    all: comments.filter((comment) => comment.status !== "trash").length,
    pending: comments.filter((comment) => comment.status === "pending").length,
    approved: comments.filter((comment) => comment.status === "approved").length,
    spam: comments.filter((comment) => comment.status === "spam").length,
    trash: comments.filter((comment) => comment.status === "trash").length,
  };
}

export async function getCommentsCount(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Yorum sayisi okunamadi: ${error.message}`);
  }

  return count ?? 0;
}

export async function updateCommentStatus(id: string, status: "pending" | "approved" | "rejected" | "hidden" | "spam" | "trash") {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { error } = await supabase
    .from("comments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Yorum guncellenemedi: ${error.message}`);
  }
}

export async function updateCommentStatuses(ids: string[], status: "pending" | "approved" | "spam" | "trash") {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  if (ids.length === 0) return;

  const { error } = await supabase
    .from("comments")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) {
    throw new Error(`Yorumlar guncellenemedi: ${error.message}`);
  }
}

export async function deleteTrashedComment(id: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("status", "trash");

  if (error) {
    throw new Error(`Yorum kalici olarak silinemedi: ${error.message}`);
  }
}

export async function deleteTrashedComments(ids: string[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");

  if (ids.length === 0) return;

  const { error } = await supabase
    .from("comments")
    .delete()
    .in("id", ids)
    .eq("status", "trash");

  if (error) {
    throw new Error(`Yorumlar kalici olarak silinemedi: ${error.message}`);
  }
}

function getProfile(profile: CommentRow["profiles"]) {
  const item = Array.isArray(profile) ? profile[0] : profile;
  const username = item?.username || "Oyuncu";
  const fullName = [item?.first_name, item?.last_name].filter(Boolean).join(" ").trim();

  return {
    userId: item?.user_id || "",
    username,
    displayName: fullName || item?.display_name || username,
    avatarUrl: item?.avatar_url || null,
    role: item?.role || "member",
  };
}

function getGame(game: CommentRow["games"]) {
  const item = Array.isArray(game) ? game[0] : game;
  return {
    title: item?.title || "Oyun",
    slug: item?.slug || "",
  };
}

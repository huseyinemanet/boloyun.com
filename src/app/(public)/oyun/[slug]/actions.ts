"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPendingComment } from "@/lib/db-comments";
import { isGameReaction, setGameReaction } from "@/lib/db-game-reactions";
import { setProfileFavorite } from "@/lib/db-session-favorites";
import { requireProfile } from "@/lib/auth";
import { getPublicSettings } from "@/lib/db-settings";
import { consumeRateLimits, getClientIp } from "@/lib/abuse";
import { invalidatePublicContent } from "@/lib/public-cache-invalidation";

const gameSessionCookie = "mini_game_session";

export async function createCommentAction(formData: FormData) {
  const gameId = String(formData.get("game_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const { community } = await getPublicSettings();
  if (!community.commentsEnabled) throw new Error("Yorum sistemi şu anda kapalı.");

  if (!gameId || !slug) {
    throw new Error("Oyun bilgisi eksik.");
  }

  if (body.length < 3 || body.length > 1000) {
    throw new Error("Yorum 3 ile 1000 karakter arasinda olmali.");
  }

  if (!isUuid(gameId)) {
    redirect(`/oyun/${slug}?comment=disabled#yorumlar`);
  }

  const profile = await requireProfile();
  const blocked = community.blockedWords.find((word) => word && body.toLocaleLowerCase("tr-TR").includes(word.toLocaleLowerCase("tr-TR")));
  if (blocked) throw new Error("Yorum yasaklı bir ifade içeriyor.");
  const status = profile.role === "admin" || !community.commentsRequireApproval ? "approved" : "pending";
  await createPendingComment(gameId, body, profile.id, status, community.dailyCommentLimit);
  if (status === "approved") {
    invalidatePublicContent({ kind: "approved-comment", gameSlug: slug });
  }
  revalidatePath("/admin/comments");
  redirect(`/oyun/${slug}?comment=${status}#yorumlar`);
}

export async function reactToGameAction(formData: FormData) {
  const { games, community } = await getPublicSettings();
  if (!games.likesEnabled || !community.ratingsEnabled) throw new Error("Oyun reaksiyonları şu anda kapalı.");
  const gameId = String(formData.get("game_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const reaction = String(formData.get("reaction") ?? "");

  if (!gameId || !slug || !isGameReaction(reaction)) {
    throw new Error("Reaksiyon bilgisi eksik.");
  }

  const sessionId = await getOrCreateGameSession();
  const rate = await consumeRateLimits([
    { action: "game-reaction-session", subject: sessionId, limit: 20, windowSeconds: 3600 },
    { action: "game-reaction-ip", subject: await getClientIp(), limit: 60, windowSeconds: 3600 },
  ]);
  if (!rate.allowed) throw new Error("Çok sık reaksiyon gönderildi. Lütfen daha sonra tekrar deneyin.");
  await setGameReaction(gameId, sessionId, reaction);

}

export async function toggleFavoriteAction(formData: FormData) {
  const { games, community } = await getPublicSettings();
  if (!games.favoritesEnabled || !community.favoritesEnabled) throw new Error("Favoriler şu anda kapalı.");
  const gameId = String(formData.get("game_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const desired = formData.get("desired") === "true";

  if (!gameId || !slug || !isUuid(gameId)) {
    throw new Error("Favori için oyun bilgisi eksik.");
  }

  const profile = await requireProfile();
  await setProfileFavorite(gameId, profile.id, desired);
}

async function getOrCreateGameSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(gameSessionCookie)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  cookieStore.set(gameSessionCookie, sessionId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return sessionId;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

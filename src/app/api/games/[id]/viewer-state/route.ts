import { NextResponse } from "next/server";
import { getCurrentProfile, getDisplayName } from "@/lib/auth";
import { getGameVoteForSession } from "@/lib/db-game-reactions";
import { getProfileFavorite, getSessionFavorite } from "@/lib/db-session-favorites";
import { getPublicSettings } from "@/lib/db-settings";
import { getGameSessionId, isUuid } from "@/lib/game-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid game id." }, { status: 400 });

  const [profile, settings, sessionId] = await Promise.all([
    getCurrentProfile(),
    getPublicSettings(),
    getGameSessionId(),
  ]);

  const [vote, favorite] = await Promise.all([
    sessionId ? getGameVoteForSession(id, sessionId) : Promise.resolve(null),
    profile?.id ? getProfileFavorite(id, profile.id) : sessionId ? getSessionFavorite(id, sessionId) : Promise.resolve(false),
  ]);

  return NextResponse.json({
    profile: profile && profile.status !== "blocked"
      ? { displayName: getDisplayName(profile), role: profile.role }
      : null,
    favorite,
    vote,
    commentsEnabled: settings.community.commentsEnabled,
    ratingsEnabled: settings.games.likesEnabled && settings.community.ratingsEnabled,
    favoritesEnabled: settings.games.favoritesEnabled && settings.community.favoritesEnabled,
  });
}

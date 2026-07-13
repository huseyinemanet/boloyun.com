import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { migrateSessionFavoritesToProfile, setProfileFavorite, setSessionFavorite } from "@/lib/db-session-favorites";
import { getPublicSettings } from "@/lib/db-settings";
import { getOrCreateGameSessionId, isUuid } from "@/lib/game-session";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid game id." }, { status: 400 });

  const settings = await getPublicSettings();
  if (!settings.games.favoritesEnabled || !settings.community.favoritesEnabled) {
    return NextResponse.json({ error: "Favorites are disabled." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null) as { desired?: unknown } | null;
  if (typeof payload?.desired !== "boolean") return NextResponse.json({ error: "Invalid desired value." }, { status: 400 });

  const sessionId = await getOrCreateGameSessionId();
  const profile = await getCurrentProfile();
  if (profile?.status === "blocked") return NextResponse.json({ error: "Account is blocked." }, { status: 403 });
  const favorite = profile?.id
    ? await setProfileFavoriteAfterMigration(id, sessionId, profile.id, payload.desired)
    : await setSessionFavorite(id, sessionId, payload.desired);

  return NextResponse.json({ favorite });
}

async function setProfileFavoriteAfterMigration(gameId: string, sessionId: string, profileId: string, desired: boolean) {
  await migrateSessionFavoritesToProfile(sessionId, profileId);
  return setProfileFavorite(gameId, profileId, desired);
}

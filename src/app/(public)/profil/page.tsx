import Image from "next/image";
import type { Metadata } from "next";
import { SoundLink } from "@/components/audio/sound-link";
import { GameCard } from "@/components/game/game-card";
import { requireProfile, getDisplayName } from "@/lib/auth";
import { getProfileComments, getProfileFavorites, getProfileRecentGames, type ProfileGameItem } from "@/lib/db-profile";
import { getPublicSettings } from "@/lib/db-settings";
import { ProfileAvatarSummary } from "@/components/profile/profile-avatar-summary";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Profil",
  robots: { index: false, follow: false, noarchive: true },
};

type Props = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function ProfilePage({ searchParams }: Props) {
  const profilePromise = requireProfile();
  const settingsPromise = getPublicSettings();
  const { notice } = await searchParams;
  const profile = await profilePromise;
  const [favorites, recentGames, comments, settings] = await Promise.all([
    getProfileFavorites(profile.id),
    getProfileRecentGames(profile.id),
    getProfileComments(profile.id),
    settingsPromise,
  ]);
  const displayName = getDisplayName(profile);

  return (
    <div className="space-y-4">
      <section>
        {notice === "password-updated" ? <p className="mb-3 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">Şifren güncellendi.</p> : null}
        {notice === "registered" ? <p className="mb-3 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">Hesabın oluşturuldu ve giriş yapıldı.</p> : null}
        <ProfileAvatarSummary avatarUrl={profile.avatarUrl} displayName={displayName} username={profile.username} uploadEnabled={settings.community.profilePhotoEnabled} />
      </section>

      <GameList id="favoriler" title="Favoriler" empty="Henüz favori oyun eklemedin." games={favorites} eagerFirst />
      <GameList title="Oynamaya Devam Et" empty="Henüz oyun kaydın yok." games={recentGames} />

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Yorumlar</h2>
        <div className="mt-3 space-y-3">
          {comments.length ? comments.map((comment) => (
            <article key={comment.id} className="flex gap-3 rounded-md border border-border p-3">
              <SoundLink href={`/oyun/${comment.gameSlug}#yorumlar`} native className="group relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:w-28" aria-label={`${comment.gameTitle} oyununu aç`}>
                <Image src={comment.gameThumbnailUrl} alt="" fill unoptimized={comment.gameThumbnailUrl.split("?", 1)[0].endsWith(".svg")} sizes="112px" draggable={false} className="game-cover-image object-cover transition group-hover:scale-105" />
              </SoundLink>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SoundLink href={`/oyun/${comment.gameSlug}#yorumlar`} native className="truncate text-sm font-semibold text-primary hover:underline">{comment.gameTitle}</SoundLink>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold text-foreground">{getStatusLabel(comment.status)}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">{comment.body}</p>
              </div>
            </article>
          )) : (
            <p className="rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">Henüz yorum yazmadın.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function GameList({ id, title, empty, games, eagerFirst = false }: { id?: string; title: string; empty: string; games: ProfileGameItem[]; eagerFirst?: boolean }) {
  return (
    <section id={id} data-analytics-view-list data-analytics-list-name={title} className="scroll-mt-20">
      <h2 className="text-lg font-semibold">{title}</h2>
      {games.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {games.map((game, index) => (
            <GameCard key={game.id} game={game} eager={eagerFirst && index === 0} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function getStatusLabel(status: string) {
  if (status === "approved") return "Yayında";
  if (status === "spam") return "Spam";
  if (status === "trash") return "Çöp";
  return "Onay bekliyor";
}

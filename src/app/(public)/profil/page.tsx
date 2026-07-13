import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { requireProfile, getDisplayName } from "@/lib/auth";
import { getProfileComments, getProfileFavorites, getProfileRecentGames, type ProfileGameItem } from "@/lib/db-profile";
import { getPublicSettings } from "@/lib/db-settings";
import { ProfileAvatarUpload } from "@/components/profile/profile-avatar-upload";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Profil",
  robots: { index: false, follow: false, noarchive: true },
};

type Props = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function ProfilePage({ searchParams }: Props) {
  const profile = await requireProfile();
  const { notice } = await searchParams;
  const [favorites, recentGames, comments, settings] = await Promise.all([
    getProfileFavorites(profile.id),
    getProfileRecentGames(profile.id),
    getProfileComments(profile.id),
    getPublicSettings(),
  ]);
  const displayName = getDisplayName(profile);

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-card p-4">
        {notice === "password-updated" ? <p className="mb-3 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">Şifren güncellendi.</p> : null}
        {notice === "registered" ? <p className="mb-3 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">Hesabın oluşturuldu ve giriş yapıldı.</p> : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={displayName} width={80} height={80} unoptimized className="size-20 rounded-md object-cover" />
            ) : (
              <span className="grid size-20 place-items-center rounded-md bg-muted text-2xl font-black text-foreground">{profile.username.slice(0, 2).toLocaleUpperCase("tr")}</span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">{displayName}</h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
          {settings.community.profilePhotoEnabled ? <ProfileAvatarUpload className="mt-0 shrink-0" /> : null}
        </div>
      </section>

      <GameList id="favoriler" title="Favoriler" empty="Henüz favori oyun eklemedin." games={favorites} />
      <GameList title="Oynamaya Devam Et" empty="Henüz oyun kaydın yok." games={recentGames} />

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-lg font-black">Yorumlar</h2>
        <div className="mt-3 space-y-3">
          {comments.length ? comments.map((comment) => (
            <article key={comment.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/oyun/${comment.gameSlug}#yorumlar`} className="text-sm font-black text-primary hover:underline">{comment.gameTitle}</Link>
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold text-foreground">{getStatusLabel(comment.status)}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">{comment.body}</p>
            </article>
          )) : (
            <p className="rounded-md bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">Henüz yorum yazmadın.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function GameList({ id, title, empty, games }: { id?: string; title: string; empty: string; games: ProfileGameItem[] }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-md border border-border bg-card p-4">
      <h2 className="text-lg font-black">{title}</h2>
      {games.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {games.map((game) => (
            <Link key={`${title}-${game.id}-${game.date}`} href={`/oyun/${game.slug}`} className="group rounded-md border border-border bg-card p-2 transition hover:border-primary">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                <Image src={game.thumbnailUrl} alt={game.title} fill sizes="180px" unoptimized className="object-cover transition group-hover:scale-105" />
              </div>
              <h3 className="mt-2 truncate text-sm font-black" title={game.title}>{game.title}</h3>
            </Link>
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

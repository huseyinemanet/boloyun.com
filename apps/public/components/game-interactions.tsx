"use client";

import { useEffect, useState } from "react";
import { Heart, ThumbsDown, ThumbsUp } from "lucide-react";

type ViewerState = {
  profile: { displayName: string } | null;
  favorite: boolean;
  vote: "like" | "dislike" | null;
  commentsEnabled: boolean;
  ratingsEnabled: boolean;
  favoritesEnabled: boolean;
};

type Props = {
  gameId: string;
  initialLikes: number;
  initialDislikes: number;
};

export function GameInteractions({ gameId, initialLikes, initialDislikes }: Props) {
  const [state, setState] = useState<ViewerState | null>(null);
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/games/${gameId}/viewer-state`, { credentials: "include" })
      .then((response) => response.ok ? response.json() as Promise<ViewerState> : null)
      .then((payload) => {
        if (active && payload) setState(payload);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [gameId]);

  async function toggleFavorite() {
    const next = !state?.favorite;
    const response = await fetch(`/api/games/${gameId}/favorite`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ desired: next }),
    });
    if (response.ok) setState((current) => current ? { ...current, favorite: next } : current);
  }

  async function vote(voteValue: "like" | "dislike") {
    const response = await fetch(`/api/games/${gameId}/vote`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vote: voteValue }),
    });
    if (!response.ok) return;
    const payload = await response.json() as { stats?: { likesCount: number; dislikesCount: number }; vote: "like" | "dislike" };
    setState((current) => current ? { ...current, vote: payload.vote } : current);
    if (payload.stats) {
      setLikes(payload.stats.likesCount);
      setDislikes(payload.stats.dislikesCount);
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`/api/games/${gameId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    if (response.ok) {
      const payload = await response.json() as { status: "pending" | "approved" };
      setComment("");
      setMessage(payload.status === "approved" ? "Yorumun yayınlandı." : "Yorumun onaya gönderildi.");
    } else if (response.status === 401) {
      setMessage("Yorum yazmak için giriş yapmalısın.");
    } else {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(payload?.error ?? "Yorum gönderilemedi.");
    }
  }

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {state?.ratingsEnabled !== false ? (
          <>
            <button type="button" onClick={() => void vote("like")} className={buttonClass(state?.vote === "like")}>
              <ThumbsUp className="size-4" aria-hidden="true" />
              {likes.toLocaleString("tr-TR")}
            </button>
            <button type="button" onClick={() => void vote("dislike")} className={buttonClass(state?.vote === "dislike")}>
              <ThumbsDown className="size-4" aria-hidden="true" />
              {dislikes.toLocaleString("tr-TR")}
            </button>
          </>
        ) : null}
        {state?.favoritesEnabled !== false ? (
          <button type="button" onClick={() => void toggleFavorite()} className={buttonClass(Boolean(state?.favorite))}>
            <Heart className="size-4" aria-hidden="true" />
            {state?.favorite ? "Favoride" : "Favorilere Ekle"}
          </button>
        ) : null}
      </div>

      {state?.commentsEnabled !== false ? (
        <form id="yorumlar" onSubmit={(event) => void submitComment(event)} className="space-y-2">
          <h2 className="text-lg font-black">Yorumlar</h2>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            minLength={3}
            maxLength={1000}
            className="min-h-24 w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Yorumunu yaz"
          />
          <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-black text-primary-foreground">
            Yorumu Gönder
          </button>
          {message ? <p className="text-sm font-semibold text-muted-foreground">{message}</p> : null}
        </form>
      ) : null}
    </section>
  );
}

function buttonClass(active: boolean) {
  return [
    "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-black transition",
    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent",
  ].join(" ");
}

"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { Game } from "@/types/game";

type GamePlayerProps = {
  game: Game;
  allowFullscreen: boolean;
  aspectRatio: string;
};

export function StaticGamePlayer({ game, allowFullscreen, aspectRatio }: GamePlayerProps) {
  const [started, setStarted] = useState(false);
  const source = game.gameType === "iframe" ? game.embedUrl : game.gameType === "html5" ? game.html5Url : game.gameType === "swf" ? game.swfUrl : game.externalUrl;

  function start() {
    setStarted(true);
    void fetch(`/api/games/${game.id}/play`, { method: "POST", credentials: "include" }).catch(() => undefined);
  }

  if (!source) {
    return (
      <div className="grid aspect-video place-items-center rounded-md border border-border bg-muted p-4 text-center text-sm font-semibold text-muted-foreground">
        Bu oyun için oynatılabilir kaynak bulunamadı.
      </div>
    );
  }

  if (game.gameType === "external") {
    return (
      <a
        href={source}
        rel="noopener noreferrer nofollow"
        target="_blank"
        className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-sm font-black text-primary-foreground"
        onClick={start}
      >
        <ExternalLink className="size-5" aria-hidden="true" />
        Oyunu Aç
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-black" style={{ aspectRatio: normalizeAspectRatio(aspectRatio) }}>
      {started ? (
        game.gameType === "swf" ? (
          <object data={source} type="application/x-shockwave-flash" className="h-full w-full">
            <param name="movie" value={source} />
          </object>
        ) : (
          <iframe
            src={source}
            title={`${game.title} oyunu`}
            className="h-full w-full"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
            allow={allowFullscreen ? "fullscreen; gamepad" : "gamepad"}
            allowFullScreen={allowFullscreen}
          />
        )
      ) : (
        <button
          type="button"
          onClick={start}
          className="relative grid h-full w-full place-items-center overflow-hidden text-primary-foreground"
          aria-label={`${game.title} oyununu başlat`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={game.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <span className="relative inline-flex h-14 items-center gap-2 rounded-md bg-primary px-6 text-base font-black shadow-xl">
            <Play className="size-5 fill-current" aria-hidden="true" />
            Oyunu Başlat
          </span>
        </button>
      )}
    </div>
  );
}

function normalizeAspectRatio(value: string) {
  return /^\d+\/\d+$/.test(value) ? value : "16/9";
}

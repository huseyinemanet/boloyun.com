"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SoundAnchor } from "@/components/audio/sound-anchor";
import { SoundLink } from "@/components/audio/sound-link";
import { useClickSound } from "@/components/audio/click-sound-provider";
import type { PlayableGameSource } from "@/types/game";
import { Button } from "@/components/ui/button";
import { useViewerState } from "@/components/auth/viewer-state-provider";

export function GamePlayer({
  game,
  playEventName,
  isLoggedIn = false,
  allowGuestPlay = true,
  allowFullscreen = true,
  aspectRatio = "16:9",
  loadTimeoutSeconds = 20,
  sourceAllowed = true,
  preRoll,
  preRollSkipSeconds = 5,
}: {
  game: PlayableGameSource;
  playEventName?: string;
  isLoggedIn?: boolean;
  allowGuestPlay?: boolean;
  allowFullscreen?: boolean;
  aspectRatio?: "16:9" | "4:3";
  loadTimeoutSeconds?: number;
  sourceAllowed?: boolean;
  preRoll?: ReactNode;
  preRollSkipSeconds?: number;
}) {
  const [started, setStarted] = useState(false);
  const [preRollActive, setPreRollActive] = useState(false);
  const [remaining, setRemaining] = useState(preRollSkipSeconds);
  const [timedOut, setTimedOut] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const viewer = useViewerState();
  const containerRef = useRef<HTMLDivElement>(null);
  const { playClickSound } = useClickSound();
  const source = useMemo(() => {
    if (game.gameType === "iframe") return game.embedUrl;
    if (game.gameType === "html5") return game.html5Url;
    if (game.gameType === "swf") return game.swfUrl;
    return game.externalUrl;
  }, [game]);

  function handleStart() {
    playClickSound();
    if (preRoll) {
      setRemaining(preRollSkipSeconds);
      setPreRollActive(true);
      return;
    }
    startGame();
  }

  function startGame() {
    setPreRollActive(false);
    setStarted(true);
    if (playEventName) window.dispatchEvent(new Event(playEventName));
    if (isUuid(game.id)) void sendPlayEvent(game.id);
  }

  useEffect(() => {
    if (!preRollActive) return;
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [preRollActive, remaining]);

  useEffect(() => {
    if (!started || loaded || game.gameType === "swf" || game.gameType === "external") return;
    const timer = window.setTimeout(() => setTimedOut(true), loadTimeoutSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [game.gameType, loadTimeoutSeconds, loaded, started]);

  const loginChecked = isLoggedIn || allowGuestPlay || viewer.loaded;
  const loggedIn = isLoggedIn || Boolean(viewer.profile);

  if (!allowGuestPlay && !loginChecked) {
    return <div className={`${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} grid place-items-center rounded-md border border-border bg-card p-6 text-center`}><p className="font-bold">Oyun hazırlanıyor...</p></div>;
  }

  if (!allowGuestPlay && !loggedIn) {
    return <div className={`${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} grid place-items-center rounded-md border border-border bg-card p-6 text-center`}><div><p className="font-bold">Bu oyunu başlatmak için giriş yapmalısın.</p><Button asChild className="mt-3"><SoundLink href="/giris">Giriş Yap</SoundLink></Button></div></div>;
  }

  if (!sourceAllowed) {
    return <div className={`${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} grid place-items-center rounded-md border border-warning/30 bg-warning/10 p-6 text-center`}><p className="font-bold text-warning">Bu oyunun kaynağı güvenli veya izinli değil.</p></div>;
  }

  if (preRollActive) {
    return <div className={`${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} grid place-items-center overflow-hidden rounded-md border border-border bg-black p-4`}><div className="w-full max-w-3xl text-center">{preRoll}<Button className="mt-4" disabled={remaining > 0} onClick={() => { playClickSound(); startGame(); }}>{remaining > 0 ? `${remaining} saniye sonra geç` : "Oyuna Geç"}</Button></div></div>;
  }

  if (!started) {
    return (
      <div className={`player-grid relative grid ${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} place-items-center overflow-hidden rounded-md bg-black text-primary-foreground`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.42),transparent_28%),radial-gradient(circle_at_70%_60%,rgba(20,184,166,0.36),transparent_32%)]" />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold text-muted-foreground">{game.title}</p>
          <Button className="h-12 px-6 text-base" onClick={handleStart}>
            Oyunu Başlat
          </Button>
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className={`grid ${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} place-items-center rounded-md border border-border bg-card p-6 text-center`}>
        <p className="font-semibold">Bu oyun için oynatma adresi eksik.</p>
      </div>
    );
  }

  if (game.gameType === "external") {
    return (
      <div className={`grid ${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} place-items-center rounded-md border border-border bg-card p-6 text-center`}>
        <div className="space-y-3">
          <p className="font-semibold">Bu oyun dış sitede açılıyor.</p>
          <Button asChild>
            <SoundAnchor href={source} target="_blank" rel="noreferrer">
              Oyunu Başlat
            </SoundAnchor>
          </Button>
        </div>
      </div>
    );
  }

  if (game.gameType === "swf") {
    return (
      <div ref={containerRef} className={`${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} overflow-hidden rounded-md bg-black`}>
        <Script src="/ruffle/ruffle.js" strategy="lazyOnload" />
        <object data={source} type="application/x-shockwave-flash" className="h-full w-full">
          <param name="movie" value={source} />
        </object>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
    <iframe
      title={game.title}
      src={source}
      loading="lazy"
      allow={`${allowFullscreen ? "fullscreen; " : ""}autoplay; gamepad`}
      allowFullScreen={allowFullscreen}
      onLoad={() => { setLoaded(true); setTimedOut(false); }}
      sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms"
      className={`${aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"} w-full rounded-md border-0 bg-black`}
    />
    {timedOut ? <div className="absolute inset-x-3 bottom-3 rounded-md bg-black/80 p-3 text-center text-sm font-bold text-white">Oyun beklenenden uzun sürede yükleniyor. Kaynağı yeniden deneyebilir veya bozuk oyun olarak bildirebilirsin.</div> : null}
    {allowFullscreen ? <Button type="button" size="sm" variant="secondary" className="absolute right-3 top-3" onClick={() => { playClickSound(); void containerRef.current?.requestFullscreen(); }}>Tam Ekran</Button> : null}
    </div>
  );
}

async function sendPlayEvent(gameId: string) {
  try {
    await fetch("/api/game-play", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId, eventId: crypto.randomUUID() }),
    });
  } catch {
    // Oyun takibi oyuncunun oyunu açmasını hiçbir zaman engellemez.
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

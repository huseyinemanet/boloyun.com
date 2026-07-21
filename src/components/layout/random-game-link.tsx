"use client";

import { useState, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";
import { IconShuffleFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconShuffleFillDuo18";
import { Button } from "@/components/ui/button";
import { SoundLink } from "@/components/audio/sound-link";
import { getRandomGameHref } from "@/lib/random-game";
import { trackAnalyticsEvent } from "@/lib/analytics";

export function RandomGameLink() {
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const pending = pendingPath === pathname;
  const href = getRandomGameHref(pathname);

  async function openRandomGame(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (pending) return;

    setPendingPath(pathname);
    trackAnalyticsEvent("random_game", { source_path: pathname });
    try {
      const response = await fetch(href, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Rastgele oyun isteği başarısız: ${response.status}`);

      const payload: unknown = await response.json();
      const nextHref = payload && typeof payload === "object" && "href" in payload
        ? (payload as { href?: unknown }).href
        : null;
      if (typeof nextHref !== "string" || !nextHref.startsWith("/oyun/")) {
        throw new Error("Rastgele oyun yanıtı geçersiz.");
      }

      router.push(nextHref);
    } catch {
      window.location.assign(href);
    }
  }

  return (
    <Button asChild size="lg" className="hidden shrink-0 md:inline-flex" aria-busy={pending}>
      <SoundLink href={href} onClick={openRandomGame}>
        <span className="grid size-[18px] shrink-0 place-items-center">
          {pending ? <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden="true" /> : <IconShuffleFillDuo18 className="size-[18px]" aria-hidden="true" />}
        </span>
        Rastgele
      </SoundLink>
    </Button>
  );
}

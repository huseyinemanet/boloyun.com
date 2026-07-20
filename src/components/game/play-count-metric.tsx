"use client";

import { useEffect, useState } from "react";
import { IconMediaPlayFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconMediaPlayFillDuo18";

export function PlayCountMetric({ initialPlayCount, eventName }: { initialPlayCount: number; eventName: string }) {
  const [playCount, setPlayCount] = useState(initialPlayCount);

  useEffect(() => {
    function handlePlayed() {
      setPlayCount((current) => current + 1);
    }

    window.addEventListener(eventName, handlePlayed);
    return () => window.removeEventListener(eventName, handlePlayed);
  }, [eventName]);

  return (
    <div className="flex items-center gap-1.5">
      <IconMediaPlayFillDuo18 className="size-4 text-primary" aria-hidden="true" />
      <span className="text-sm font-medium text-muted-foreground">Oynanma</span>
      <span className="text-sm font-semibold text-foreground">{playCount.toLocaleString("tr-TR")}</span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

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
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">Oynanma</span>
      <span className="text-sm font-semibold text-foreground">{playCount.toLocaleString("tr-TR")}</span>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ImportsToolbar({
  disabled,
  onClearSelection,
  onSelectAll,
}: {
  disabled?: boolean;
  onClearSelection: () => void;
  onSelectAll: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (disabled) return;

      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "a") {
        return;
      }

      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) {
        return;
      }

      event.preventDefault();
      onSelectAll();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, onSelectAll]);

  return (
    <>
      <Button
        type="button"
        onClick={onSelectAll}
        disabled={disabled}
        variant="outline"
        className="h-9 px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
      >
        Yayınlanabilirleri Seç
      </Button>
      <Button
        type="button"
        onClick={onClearSelection}
        disabled={disabled}
        variant="outline"
        className="h-9 px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
      >
        Seçimi Temizle
      </Button>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconPencilFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPencilFillDuo18";
import { Button } from "@/components/ui/button";

type AdminProfile = {
  role: "admin" | "member";
  status?: "active" | "blocked";
};

type MeResponse = {
  profile: AdminProfile | null;
};

export function AdminEditGameLink({ gameId, title }: { gameId: string; title: string }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    void fetch("/api/me", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<MeResponse>;
      })
      .then((data) => {
        if (!mounted) return;
        const profile = data?.profile;
        setIsAdmin(profile?.role === "admin" && (profile.status ?? "active") === "active");
      })
      .catch(() => {
        if (mounted) setIsAdmin(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
      <Link href={`/admin/games/${gameId}/edit`} prefetch={false} aria-label={`${title} oyununu admin panelinde düzenle`}>
        <IconPencilFillDuo18 className="size-4" aria-hidden="true" />
        Düzenle
      </Link>
    </Button>
  );
}

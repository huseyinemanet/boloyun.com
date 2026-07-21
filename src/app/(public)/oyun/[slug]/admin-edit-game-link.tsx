"use client";

import Link from "next/link";
import { IconPencilFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconPencilFillDuo18";
import { Button } from "@/components/ui/button";
import { useViewerState } from "@/components/auth/viewer-state-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminEditGameLink({ gameId, title }: { gameId: string; title: string }) {
  const { profile } = useViewerState();
  const isAdmin = profile?.role === "admin" && profile.status === "active";

  if (!isAdmin) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/games/${gameId}/edit`} prefetch={false} aria-label={`${title} oyununu admin panelinde düzenle`}>
            <IconPencilFillDuo18 className="size-4" aria-hidden="true" />
            Düzenle
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent><p>Oyunu düzenle</p></TooltipContent>
    </Tooltip>
  );
}

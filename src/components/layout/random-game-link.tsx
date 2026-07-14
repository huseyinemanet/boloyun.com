"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";
import { IconShuffleFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconShuffleFillDuo18";
import { Button } from "@/components/ui/button";
import { SoundLink } from "@/components/audio/sound-link";

export function RandomGameLink() {
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const pathname = usePathname();
  const pending = pendingPath === pathname;

  return (
    <Button asChild size="lg" className="hidden shrink-0 md:inline-flex" aria-busy={pending}>
      <SoundLink href="/rastgele" onClick={() => setPendingPath(pathname)}>
        <span className="grid size-[18px] shrink-0 place-items-center">
          {pending ? <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden="true" /> : <IconShuffleFillDuo18 className="size-[18px]" aria-hidden="true" />}
        </span>
        Rastgele
      </SoundLink>
    </Button>
  );
}

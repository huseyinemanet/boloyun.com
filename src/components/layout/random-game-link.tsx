"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { IconShuffleFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconShuffleFillDuo18";
import { Button } from "@/components/ui/button";

export function RandomGameLink() {
  const [pending, setPending] = useState(false);

  return (
    <Button asChild size="lg" className="hidden shrink-0 md:inline-flex" aria-busy={pending}>
      <Link href="/rastgele" onClick={() => setPending(true)}>
        <span className="grid size-[18px] shrink-0 place-items-center">
          {pending ? <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden="true" /> : <IconShuffleFillDuo18 className="size-[18px]" aria-hidden="true" />}
        </span>
        Rastgele
      </Link>
    </Button>
  );
}

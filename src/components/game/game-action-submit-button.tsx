"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GameActionSubmitButtonProps = {
  active?: boolean;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  count?: string;
  iconOnly?: boolean;
  title: string;
};

export function GameActionSubmitButton({
  active = false,
  ariaLabel,
  children,
  className,
  count,
  iconOnly = false,
  title,
}: GameActionSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      variant="secondary"
      size={iconOnly ? "icon" : "default"}
      className={cn(iconOnly ? undefined : "h-9 gap-1.5 px-2.5", active ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "", className)}
      type="submit"
      aria-label={ariaLabel}
      aria-pressed={active}
      aria-busy={pending}
      disabled={pending}
      title={title}
    >
      <span className="grid size-[18px] shrink-0 place-items-center">
        {pending ? <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden="true" /> : children}
      </span>
      {count ? <span className="min-w-[1ch] tabular-nums">{count}</span> : null}
    </Button>
  );
}

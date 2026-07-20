"use client";

import Image from "next/image";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { ProfileAvatarUpload } from "@/components/profile/profile-avatar-upload";
import { cn } from "@/lib/utils";

type Props = {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  uploadEnabled: boolean;
};

export function ProfileAvatarSummary({ avatarUrl, displayName, username, uploadEnabled }: Props) {
  const [pending, setPending] = useState(false);
  const initials = username.slice(0, 2).toLocaleUpperCase("tr");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={80}
              height={80}
              priority
              className={cn("size-20 rounded-md object-cover transition-opacity", pending && "opacity-60")}
            />
          ) : (
            <span className={cn("grid size-20 place-items-center rounded-md text-2xl font-semibold text-foreground transition-opacity", pending && "opacity-60")}>{initials}</span>
          )}
          {pending ? (
            <span className="absolute inset-0 grid place-items-center bg-background/45 backdrop-blur-[1px]" aria-label="Fotoğraf yükleniyor">
              <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
            </span>
          ) : null}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{displayName}</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">@{username}</p>
        </div>
      </div>
      {uploadEnabled ? <ProfileAvatarUpload className="mt-0 shrink-0" onPendingChange={setPending} /> : null}
    </div>
  );
}

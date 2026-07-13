"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, Shield, UserRound } from "lucide-react";

type MeResponse = {
  profile: null | {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: "admin" | "member";
  };
};

export function AccountMenu() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me", { credentials: "include" })
      .then((response) => response.ok ? response.json() as Promise<MeResponse> : null)
      .then((payload) => {
        if (active) setMe(payload);
      })
      .catch(() => {
        if (active) setMe({ profile: null });
      });
    return () => {
      active = false;
    };
  }, []);

  if (!me) {
    return <div className="size-10 shrink-0 rounded-full border border-border bg-muted" aria-hidden="true" />;
  }

  if (!me.profile) {
    return (
      <Link
        href="/giris"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent"
        aria-label="Giriş yap"
        title="Giriş Yap"
      >
        <LogIn className="size-5" aria-hidden="true" />
      </Link>
    );
  }

  const initials = me.profile.displayName.slice(0, 2).toLocaleUpperCase("tr-TR");

  return (
    <div className="group relative shrink-0">
      <Link
        href="/profil"
        className="grid size-10 place-items-center rounded-full border border-border bg-primary text-sm font-black text-primary-foreground"
        aria-label="Profil"
        title={me.profile.displayName}
      >
        {me.profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.profile.avatarUrl} alt="" className="size-full rounded-full object-cover" />
        ) : initials}
      </Link>
      <div className="invisible absolute right-0 top-11 w-44 rounded-md border border-border bg-popover p-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
        <Link href="/profil" className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm font-semibold hover:bg-accent">
          <UserRound className="size-4" aria-hidden="true" />
          Profil
        </Link>
        {me.profile.role === "admin" ? (
          <Link href="/admin" className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm font-semibold hover:bg-accent">
            <Shield className="size-4" aria-hidden="true" />
            Admin
          </Link>
        ) : null}
        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full rounded-sm px-2 py-2 text-left text-sm font-semibold hover:bg-accent">
            Çıkış
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { IconCircleLogoutFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleLogoutFillDuo18";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { IconProfileBasicFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconProfileBasicFillDuo18";
import { IconShieldCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconShieldCheckFillDuo18";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SoundLink } from "@/components/audio/sound-link";
import { useViewerState, type ViewerProfile } from "@/components/auth/viewer-state-provider";

export function HeaderAccountMenu({ showRegister }: { showRegister: boolean }) {
  const pathname = usePathname();
  const { loaded, profile } = useViewerState();
  const protectedAccountPath = pathname === "/profil" || pathname.startsWith("/profil/") || pathname.startsWith("/admin");

  if (!loaded) return <AccountLoading />;
  if (!profile && protectedAccountPath) return <AccountLoading />;
  if (!profile) return <AccountLinks showRegister={showRegister} />;

  const displayName = getDisplayName(profile);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-10 shrink-0 place-items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Hesap menüsünü aç"
      >
        <Avatar size="lg">
          {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={displayName} /> : null}
          <AvatarFallback>{profile.username.slice(0, 2).toLocaleUpperCase("tr")}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border/70 bg-popover/80 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-popover/70">
        <div className="px-3 py-2">
          <p className="truncate font-semibold text-foreground">{displayName}</p>
          {profile.email ? <p className="truncate text-xs text-muted-foreground">{profile.email}</p> : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <SoundLink href="/profil" className="gap-2">
              <IconProfileBasicFillDuo18 className="size-[18px] shrink-0" aria-hidden="true" />
              Profil
            </SoundLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <SoundLink href="/profil#favoriler" className="gap-2">
              <IconHeartFillDuo18 className="size-[18px] shrink-0" aria-hidden="true" />
              Favorilerim
            </SoundLink>
          </DropdownMenuItem>
          {profile.role === "admin" ? (
            <DropdownMenuItem asChild>
              <SoundLink href="/admin" className="gap-2">
                <IconShieldCheckFillDuo18 className="size-[18px] shrink-0" aria-hidden="true" />
                Admin
              </SoundLink>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full gap-2 text-left text-foreground">
              <IconCircleLogoutFillDuo18 className="size-[18px] shrink-0" aria-hidden="true" />
              Çıkış
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountLoading() {
  return (
    <div
      className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card"
      aria-label="Hesap bilgisi yükleniyor"
      aria-busy="true"
    >
      <span className="size-5 animate-pulse rounded-full bg-muted-foreground/40" />
    </div>
  );
}

function AccountLinks({ showRegister }: { showRegister: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <SoundLink href="/giris" native className="inline-flex h-10 items-center justify-center rounded-md border border-border px-3 text-sm font-semibold leading-none">
        Giriş Yap
      </SoundLink>
      {showRegister ? <SoundLink href="/kayit" native className="hidden h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold leading-none text-primary-foreground sm:inline-flex">Kayıt Ol</SoundLink> : null}
    </div>
  );
}

function getDisplayName(profile: Pick<ViewerProfile, "displayName" | "firstName" | "lastName" | "username">) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return profile.displayName || fullName || profile.username;
}

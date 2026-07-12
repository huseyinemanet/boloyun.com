import Image from "next/image";
import Link from "next/link";
import { IconCircleLogoutFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleLogoutFillDuo18";
import { IconHeartFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconHeartFillDuo18";
import { IconProfileBasicFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconProfileBasicFillDuo18";
import { IconShieldCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconShieldCheckFillDuo18";
import { IconShuffleFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconShuffleFillDuo18";
import { getCurrentProfile, getDisplayName } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchAutocomplete } from "@/components/layout/search-autocomplete";
import { getPublicSettings } from "@/lib/db-settings";

const sectionLinks = [
  { href: "/#yeni-oyunlar", label: "Yeni Oyunlar" },
  { href: "/#populer-oyunlar", label: "Popüler Oyunlar" },
  { href: "/#trend-oyunlar", label: "Trend Oyunlar" },
] as const;

export async function Header() {
  const [profile, settings] = await Promise.all([getCurrentProfile(), getPublicSettings()]);
  const displayName = profile ? getDisplayName(profile) : "";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 items-center gap-4 px-3 md:gap-5 md:px-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${settings.general.siteName} ana sayfa`}>
          <Image
            src={settings.general.logoUrl}
            alt={settings.general.siteName}
            width={1152}
            height={411}
            priority
            className="h-8 w-auto sm:h-10"
          />
        </Link>

        <SearchAutocomplete />

        <nav aria-label="Oyun bölümleri" className="hidden shrink-0 items-center gap-2 lg:flex">
          {sectionLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-2 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button asChild size="lg" className="hidden shrink-0 md:inline-flex">
          <Link href="/rastgele">
            <IconShuffleFillDuo18 className="size-[18px]" aria-hidden="true" />
            Rastgele
          </Link>
        </Button>
        {profile ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="grid size-10 shrink-0 place-items-center rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                  <Link href="/profil" className="gap-2">
                    <IconProfileBasicFillDuo18 className="size-[18px] shrink-0" aria-hidden="true" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profil#favoriler" className="gap-2">
                    <IconHeartFillDuo18 className="size-[18px] shrink-0" aria-hidden="true" />
                    Favorilerim
                  </Link>
                </DropdownMenuItem>
                {profile.role === "admin" ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="gap-2">
                      <IconShieldCheckFillDuo18 className="size-[18px] shrink-0" aria-hidden="true" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <form action="/auth/signout" method="post">
                <DropdownMenuItem asChild>
                  <Button type="submit" variant="ghost" className="h-7 w-full justify-start gap-2 text-left text-foreground">
                    <IconCircleLogoutFillDuo18 className="size-[18px] shrink-0" aria-hidden="true" />
                    Çıkış
                  </Button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/giris" className="h-10 rounded-md border border-border px-3 py-2 text-sm font-semibold">
              Giriş Yap
            </Link>
            {settings.general.registrationsEnabled && settings.community.registrationsEnabled ? <Link href="/kayit" className="hidden h-10 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">Kayıt Ol</Link> : null}
          </div>
        )}
      </div>
    </header>
  );
}

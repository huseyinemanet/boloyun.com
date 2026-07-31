import { BolOyunLogo } from "@/components/layout/bol-oyun-logo";
import { HeaderAccountMenu } from "@/components/layout/header-account-menu";
import { RandomGameLink } from "@/components/layout/random-game-link";
import { SearchAutocomplete } from "@/components/layout/search-autocomplete";
import { getPublicSettings } from "@/lib/db-settings";
import { SoundLink } from "@/components/audio/sound-link";
import { IconArrowTrendUpFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconArrowTrendUpFillDuo18";
import { IconFireFlameFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconFireFlameFillDuo18";
import { IconSparkleFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconSparkleFillDuo18";

const sectionLinks = [
  { href: "/#yeni-oyunlar", label: "Yeni Oyunlar", icon: IconSparkleFillDuo18 },
  { href: "/#populer-oyunlar", label: "Popüler Oyunlar", icon: IconFireFlameFillDuo18 },
  { href: "/#trend-oyunlar", label: "Trend Oyunlar", icon: IconArrowTrendUpFillDuo18 },
] as const;

export async function Header() {
  const settings = await getPublicSettings();
  const showRegister = settings.community.registrationsEnabled;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 items-center gap-4 px-3 md:gap-5 md:px-4">
        <SoundLink href="/" native className="flex shrink-0 items-center" aria-label={`${settings.general.siteName} ana sayfa`}>
          <BolOyunLogo className="logo-glitch h-8 w-auto select-none sm:h-10" />
        </SoundLink>

        <SearchAutocomplete />

        <nav aria-label="Oyun bölümleri" className="hidden shrink-0 items-center gap-2 lg:flex">
          {sectionLinks.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                data-click-sound="true"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Icon aria-hidden="true" className="size-[18px] shrink-0 text-primary" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <RandomGameLink />
        <HeaderAccountMenu showRegister={showRegister} />
      </div>
    </header>
  );
}

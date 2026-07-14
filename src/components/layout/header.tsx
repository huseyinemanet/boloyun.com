import { BolOyunLogo } from "@/components/layout/bol-oyun-logo";
import { HeaderAccountMenu } from "@/components/layout/header-account-menu";
import { RandomGameLink } from "@/components/layout/random-game-link";
import { SearchAutocomplete } from "@/components/layout/search-autocomplete";
import { getPublicSettings } from "@/lib/db-settings";
import { SoundLink } from "@/components/audio/sound-link";

const sectionLinks = [
  { href: "/#yeni-oyunlar", label: "Yeni Oyunlar" },
  { href: "/#populer-oyunlar", label: "Popüler Oyunlar" },
  { href: "/#trend-oyunlar", label: "Trend Oyunlar" },
] as const;

export async function Header() {
  const settings = await getPublicSettings();
  const showRegister = settings.general.registrationsEnabled && settings.community.registrationsEnabled;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 items-center gap-4 px-3 md:gap-5 md:px-4">
        <SoundLink href="/" className="flex shrink-0 items-center" aria-label={`${settings.general.siteName} ana sayfa`}>
          <BolOyunLogo className="h-8 w-auto select-none sm:h-10" />
        </SoundLink>

        <SearchAutocomplete />

        <nav aria-label="Oyun bölümleri" className="hidden shrink-0 items-center gap-2 lg:flex">
          {sectionLinks.map((item) => (
            <SoundLink
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-2 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </SoundLink>
          ))}
        </nav>

        <RandomGameLink />
        <HeaderAccountMenu showRegister={showRegister} />
      </div>
    </header>
  );
}

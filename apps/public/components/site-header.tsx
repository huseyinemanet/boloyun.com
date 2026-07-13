import Link from "next/link";
import { Dice5 } from "lucide-react";
import { AccountMenu } from "./account-menu";
import { SearchBox } from "./search-box";

type SiteHeaderProps = {
  siteName: string;
};

export function SiteHeader({ siteName }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 md:px-4">
        <Link href="/" className="shrink-0 text-xl font-black tracking-normal text-foreground" aria-label={`${siteName} ana sayfa`}>
          Bol Oyun
        </Link>
        <SearchBox />
        <Link
          href="/rastgele"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:bg-accent"
          aria-label="Rastgele oyun aç"
          title="Rastgele"
        >
          <Dice5 className="size-5" aria-hidden="true" />
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Suggestion = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  shortDescription: string;
};

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() as Promise<{ suggestions?: Suggestion[]; results?: Suggestion[] }> : null)
        .then((payload) => setItems((payload?.suggestions ?? payload?.results ?? []).slice(0, 6)))
        .catch(() => setItems([]));
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const searchHref = useMemo(() => `/arama${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ""}`, [trimmed]);

  return (
    <div className="relative min-w-0 flex-1">
      <form action="/arama" className="flex h-10 items-center rounded-md border border-border bg-card px-2">
        <Search className="mr-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Oyun Ara"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
      </form>
      {trimmed.length >= 2 && items.length > 0 ? (
        <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-md border border-border bg-popover shadow-xl">
          {items.map((item) => (
            <Link key={item.id} href={`/oyun/${item.slug}`} className="flex gap-2 border-b border-border p-2 last:border-b-0 hover:bg-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnailUrl} alt="" className="h-12 w-16 rounded-sm object-cover" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{item.title}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{item.shortDescription}</span>
              </span>
            </Link>
          ))}
          <Link href={searchHref} className="block px-3 py-2 text-sm font-black text-primary hover:bg-accent">
            Tüm sonuçları göster
          </Link>
        </div>
      ) : null}
    </div>
  );
}

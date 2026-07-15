"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { LoaderCircleIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { SoundLink } from "@/components/audio/sound-link";
import { IntentPrefetchLink } from "@/components/navigation/intent-prefetch-link";
import { Input } from "@/components/ui/input";
import type { GameSearchSuggestion } from "@/types/game";

type SearchResponse = {
  items: GameSearchSuggestion[];
};

const MINIMUM_QUERY_LENGTH = 3;
const SEARCH_CACHE_KEY = "boloyun_search_suggestions_v1";

export function SearchAutocomplete() {
  const listboxId = useId();
  const router = useRouter();
  const cache = useRef(new Map<string, GameSearchSuggestion[]>());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim();
  const showPanel = open && (normalizedQuery.length >= MINIMUM_QUERY_LENGTH || results.length > 0 || loading);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SEARCH_CACHE_KEY);
      if (!stored) return;
      const entries = JSON.parse(stored) as Array<[string, GameSearchSuggestion[]]>;
      cache.current = new Map(entries.slice(-30));
    } catch {
      // Bozuk ya da kapalı sessionStorage aramayı engellemez.
    }
  }, []);

  useEffect(() => {
    const searchTerm = query.trim();
    if (searchTerm.length < MINIMUM_QUERY_LENGTH) return;

    const cacheKey = searchTerm.toLocaleLowerCase("tr");
    if (cache.current.has(cacheKey)) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setOpen(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Arama sonuçları yüklenemedi.");

        const data = await response.json() as SearchResponse;
        const items = Array.isArray(data.items) ? data.items : [];
        rememberResults(cache.current, cacheKey, items);
        setResults(items);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function handleQueryChange(value: string) {
    const searchTerm = value.trim();
    const cacheKey = searchTerm.toLocaleLowerCase("tr");
    const cachedResults = cache.current.get(cacheKey);

    setQuery(value);
    setActiveIndex(-1);

    if (searchTerm.length < MINIMUM_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    setResults(cachedResults ?? []);
    setLoading(false);
    setOpen(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
  }

  function submitSearch() {
    if (!normalizedQuery) return;
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/arama?q=${encodeURIComponent(normalizedQuery)}`);
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <form
      action="/arama"
      role="search"
      className="relative mx-auto w-full max-w-2xl"
      onBlur={handleBlur}
      onSubmit={(event) => {
        event.preventDefault();
        submitSearch();
      }}
    >
      <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-2 shadow-sm transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          name="q"
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => {
            if (normalizedQuery.length >= MINIMUM_QUERY_LENGTH) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Oyun ara..."
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label="Oyun ara"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          className="h-10 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        />
        {loading ? <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Aranıyor" /> : null}
      </div>

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Oyun önerileri"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(420px,70vh)] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading && results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Oyunlar aranıyor...</p>
          ) : results.length ? (
            results.map((game, index) => (
              <IntentPrefetchLink
                key={game.id}
                id={`${listboxId}-${index}`}
                href={`/oyun/${game.slug}`}
                role="option"
                aria-selected={activeIndex === index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md p-2 outline-none transition hover:bg-accent focus:bg-accent aria-selected:bg-accent"
              >
                <span className="relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image src={game.thumbnailUrl} alt="" fill sizes="64px" unoptimized className="object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">{game.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {game.shortDescription || "Oyunu aç ve hemen oynamaya başla."}
                  </span>
                </span>
              </IntentPrefetchLink>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Bu aramayla eşleşen oyun bulunamadı.</p>
          )}

          {!loading ? (
            <SoundLink
              href={`/arama?q=${encodeURIComponent(normalizedQuery)}`}
              native
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center rounded-md border-t border-border px-3 py-2 text-sm font-bold text-primary hover:bg-accent"
            >
              Tüm sonuçları göster
            </SoundLink>
          ) : null}
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {loading ? "Oyunlar aranıyor" : showPanel ? `${results.length} oyun önerisi bulundu` : ""}
      </span>
    </form>
  );
}

function rememberResults(cache: Map<string, GameSearchSuggestion[]>, key: string, items: GameSearchSuggestion[]) {
  cache.set(key, items);
  if (cache.size > 30) cache.delete(cache.keys().next().value ?? "");
  try {
    sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(Array.from(cache.entries())));
  } catch {
    // Öneri cache'i isteğe bağlıdır.
  }
}

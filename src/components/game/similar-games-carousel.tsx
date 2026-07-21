"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { GameCard } from "@/components/game/game-card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type SimilarGame = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
};

type SimilarGamesCarouselProps = {
  games: SimilarGame[];
};

export function SimilarGamesCarousel({ games }: SimilarGamesCarouselProps) {
  const visibleGames = useMemo(() => games.slice(0, 25), [games]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(visibleGames.length > 5);
  const [visibleGameIds, setVisibleGameIds] = useState<Set<string>>(
    () => new Set(visibleGames.slice(0, 5).map((game) => game.id)),
  );
  const renderedGames = isHydrated ? visibleGames : visibleGames.slice(0, 5);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsHydrated(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (isHydrated) api?.reInit();
  }, [api, isHydrated]);

  const updateCarouselState = useCallback((carouselApi: NonNullable<CarouselApi>) => {
    setCanScrollLeft(carouselApi.canScrollPrev());
    setCanScrollRight(carouselApi.canScrollNext());

    const indexes = new Set(carouselApi.slidesInView());
    carouselApi.slidesInView().forEach((index) => {
      indexes.add(index - 1);
      indexes.add(index + 1);
    });
    setVisibleGameIds((current) => {
      const next = new Set(current);
      indexes.forEach((index) => {
        const game = visibleGames[index];
        if (game) next.add(game.id);
      });
      return next.size === current.size ? current : next;
    });
  }, [visibleGames]);

  useEffect(() => {
    if (!api) return;
    const update = () => updateCarouselState(api);
    const frame = requestAnimationFrame(update);
    api.on("select", update);
    api.on("reInit", update);
    api.on("slidesInView", update);

    return () => {
      cancelAnimationFrame(frame);
      api.off("select", update);
      api.off("reInit", update);
      api.off("slidesInView", update);
    };
  }, [api, updateCarouselState]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!api || (event.key !== "Home" && event.key !== "End")) return;
    event.preventDefault();
    api.scrollTo(event.key === "Home" ? 0 : api.scrollSnapList().length - 1);
  };

  return (
    <section data-analytics-view-list data-analytics-list-name="Benzer Oyunlar">
      <Carousel
        setApi={setApi}
        opts={{ align: "start", containScroll: "trimSnaps", slidesToScroll: "auto" }}
        aria-label="Benzer oyunlar"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Benzer Oyunlar</h2>
          <div className="hidden items-center gap-2 sm:flex" aria-label="Benzer oyunlar karusel kontrolleri">
            <CarouselPrevious
              variant="secondary"
              aria-label="Önceki oyunlar"
              className="static border border-border bg-secondary shadow-sm hover:bg-secondary/80"
            />
            <CarouselNext
              variant="secondary"
              aria-label="Sonraki oyunlar"
              className="static border border-border bg-secondary shadow-sm hover:bg-secondary/80"
            />
          </div>
        </div>

        <div className="relative">
          <CarouselContent>
            {renderedGames.map((game) => (
              <CarouselItem
                key={game.id}
                data-carousel-game-id={game.id}
                className="basis-1/2 sm:basis-1/3 lg:basis-1/5"
              >
                <GameCard game={game} loadImage={visibleGameIds.has(game.id)} />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity",
              canScrollLeft ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity",
              canScrollRight ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </Carousel>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { configureAnalytics, gameAnalyticsItem, trackAnalyticsEvent, type AnalyticsEventName, type AnalyticsParams } from "@/lib/analytics";

export function AnalyticsRuntime({ allowed, googleAnalytics, googleTagManager }: { allowed: boolean; googleAnalytics: boolean; googleTagManager: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPage = useRef("");

  useEffect(() => {
    configureAnalytics({ allowed, googleAnalytics, googleTagManager });
    if (!allowed || pathname.startsWith("/admin")) return;
    const pageLocation = window.location.href;
    if (lastPage.current === pageLocation) return;
    lastPage.current = pageLocation;
    trackAnalyticsEvent("page_view", {
      page_title: document.title,
      page_location: pageLocation,
      page_path: `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
    });
    trackCurrentView(pathname);
    trackAuthOutcome(pathname, searchParams);
  }, [allowed, googleAnalytics, googleTagManager, pathname, searchParams]);

  useEffect(() => {
    function trackDeclarativeEvent(event: Event) {
      const clickedElement = event.target instanceof Element ? event.target : null;
      const target = clickedElement?.closest<HTMLElement>("[data-analytics-event]") ?? null;
      const gameLink = !target ? clickedElement?.closest<HTMLAnchorElement>('a[href^="/oyun/"]') ?? null : null;
      if ((!target && !gameLink) || clickedElement?.closest("[data-analytics-ignore]")) return;
      const name = (target?.dataset.analyticsEvent ?? (gameLink ? "select_item" : undefined)) as AnalyticsEventName | undefined;
      if (!name) return;
      if (event.type === "click" && target instanceof HTMLFormElement) return;
      const gameList = gameLink?.closest<HTMLElement>("[data-analytics-view-list]");
      const gameListName = gameList?.dataset.analyticsListName;
      const params: AnalyticsParams = {
        content_type: target?.dataset.analyticsContentType,
        content_id: target?.dataset.analyticsContentId,
        content_name: target?.dataset.analyticsContentName,
        item_list_name: target?.dataset.analyticsListName ?? gameListName,
        link_url: target instanceof HTMLAnchorElement ? target.href : gameLink?.href,
      };
      if (gameLink) {
        params.items = [gameAnalyticsItem(
          { id: gameSlug(gameLink), title: gameLink.querySelector("h3")?.textContent?.trim() || gameSlug(gameLink) },
          { item_list_name: gameListName, index: gameList ? gameLinks(gameList).indexOf(gameLink) : undefined },
        )];
      } else if (target?.dataset.analyticsItemId && target.dataset.analyticsItemName) {
        params.items = [gameAnalyticsItem(
          { id: target.dataset.analyticsItemId, title: target.dataset.analyticsItemName },
          {
            item_list_name: target.dataset.analyticsListName,
            index: parseOptionalIndex(target.dataset.analyticsIndex),
          },
        )];
      }
      if (name === "login_attempt" || name === "sign_up_attempt") rememberAuthAttempt(name, target?.dataset.analyticsContentType || "password");
      trackAnalyticsEvent(name, params);
    }

    document.addEventListener("click", trackDeclarativeEvent);
    document.addEventListener("submit", trackDeclarativeEvent);
    return () => {
      document.removeEventListener("click", trackDeclarativeEvent);
      document.removeEventListener("submit", trackDeclarativeEvent);
    };
  }, []);

  return null;
}

function trackCurrentView(pathname: string) {
  if (pathname.startsWith("/oyun/")) {
    const slug = pathname.split("/").filter(Boolean)[1] ?? "unknown";
    trackAnalyticsEvent("view_item", { items: [gameAnalyticsItem({ id: slug, title: document.querySelector("h1")?.textContent?.trim() || slug })] });
  }

  for (const list of document.querySelectorAll<HTMLElement>("[data-analytics-view-list]")) {
    const listName = list.dataset.analyticsListName;
    if (!listName) continue;
    const items = gameLinks(list)
      .map((item, index) => gameAnalyticsItem(
        { id: gameSlug(item), title: item.querySelector("h3")?.textContent?.trim() || gameSlug(item) },
        { item_list_name: listName, index },
      ));
    if (items.length) trackAnalyticsEvent("view_item_list", { item_list_name: listName, items });
  }

  const search = document.querySelector<HTMLElement>("[data-analytics-search-term]");
  const searchTerm = search?.dataset.analyticsSearchTerm?.trim();
  if (searchTerm) {
    trackAnalyticsEvent("search", {
      search_term: searchTerm,
      result_count: Number.parseInt(search?.dataset.analyticsResultCount ?? "0", 10) || 0,
    });
  }
}

function gameLinks(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href^="/oyun/"]'));
}

function gameSlug(link: HTMLAnchorElement) {
  return new URL(link.href).pathname.split("/").filter(Boolean)[1] ?? "unknown";
}

const AUTH_ATTEMPT_KEY = "boloyun_analytics_auth_attempt";

function rememberAuthAttempt(event: "login_attempt" | "sign_up_attempt", method: string) {
  try {
    sessionStorage.setItem(AUTH_ATTEMPT_KEY, JSON.stringify({ event, method, createdAt: Date.now() }));
  } catch {
    // Kimlik doğrulama akışı depolama kapalıyken de çalışır.
  }
}

function trackAuthOutcome(pathname: string, searchParams: URLSearchParams) {
  try {
    const raw = sessionStorage.getItem(AUTH_ATTEMPT_KEY);
    if (!raw) return;
    const attempt = JSON.parse(raw) as { event?: string; method?: string; createdAt?: number };
    if (!attempt.createdAt || Date.now() - attempt.createdAt > 10 * 60 * 1000) {
      sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
      return;
    }

    if (attempt.event === "login_attempt") {
      if (pathname === "/giris" && searchParams.has("error")) sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
      else if (pathname !== "/giris") {
        trackAnalyticsEvent("login", { method: attempt.method || "password" });
        sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
      }
      return;
    }

    if (attempt.event === "sign_up_attempt") {
      const succeeded = (pathname === "/profil" && searchParams.get("notice") === "registered")
        || (pathname === "/giris" && searchParams.get("notice") === "verify-email");
      if (succeeded) {
        trackAnalyticsEvent("sign_up", { method: attempt.method || "password" });
        sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
      } else if (pathname === "/kayit" && searchParams.has("error")) {
        sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
      }
    }
  } catch {
    // Bozuk ya da kapalı sessionStorage ölçümü engeller; kullanıcı akışı etkilenmez.
  }
}

function parseOptionalIndex(value?: string) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

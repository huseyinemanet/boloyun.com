export type AnalyticsEventName =
  | "page_view"
  | "view_item"
  | "view_item_list"
  | "select_item"
  | "search"
  | "game_start"
  | "game_loaded"
  | "game_load_timeout"
  | "game_fullscreen"
  | "game_external_open"
  | "game_preroll_skip"
  | "add_to_wishlist"
  | "remove_from_wishlist"
  | "game_reaction"
  | "share"
  | "comment_submit"
  | "random_game"
  | "login_attempt"
  | "login"
  | "sign_up_attempt"
  | "sign_up"
  | "profile_avatar_update"
  | "exception";

export type AnalyticsValue = string | number | boolean | AnalyticsItem[];

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_list_name?: string;
  index?: number;
};

export type AnalyticsParams = Record<string, AnalyticsValue | null | undefined>;

type AnalyticsRuntimeConfig = {
  allowed: boolean;
  googleAnalytics: boolean;
  googleTagManager: boolean;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __boloyunAnalytics?: AnalyticsRuntimeConfig;
  }
}

const MAX_TEXT_LENGTH = 100;
const MAX_ITEMS = 20;
export const analyticsReadyEvent = "boloyun_analytics_ready";
const piiPatterns = [
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,
  /(?:\+?\d[\s().-]*){10,}/g,
];

export function configureAnalytics(config: AnalyticsRuntimeConfig) {
  if (typeof window === "undefined") return;
  const wasAllowed = window.__boloyunAnalytics?.allowed === true;
  window.__boloyunAnalytics = config;
  if (!config.allowed) return;
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
  if (!wasAllowed) window.dispatchEvent(new Event(analyticsReadyEvent));
}

export function trackAnalyticsEvent(event: AnalyticsEventName, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return false;
  const config = window.__boloyunAnalytics;
  if (!config?.allowed || (!config.googleAnalytics && !config.googleTagManager)) return false;

  const safeParams = sanitizeAnalyticsParams(params);
  window.dataLayer ??= [];

  if (config.googleTagManager) {
    window.dataLayer.push({ event, ...safeParams });
  }

  if (config.googleAnalytics) {
    window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("event", event, safeParams);
  }
  return true;
}

export function gameAnalyticsItem(game: { id: string; title: string }, extra: Omit<AnalyticsItem, "item_id" | "item_name"> = {}): AnalyticsItem {
  return {
    item_id: sanitizeText(game.id),
    item_name: sanitizeText(game.title),
    ...extra,
  };
}

export function sanitizeAnalyticsParams(params: AnalyticsParams): Record<string, AnalyticsValue> {
  const safe: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      safe[key] = value.slice(0, MAX_ITEMS).map((item) => ({
        item_id: sanitizeText(item.item_id),
        item_name: sanitizeText(item.item_name),
        ...(item.item_category ? { item_category: sanitizeText(item.item_category) } : {}),
        ...(item.item_list_name ? { item_list_name: sanitizeText(item.item_list_name) } : {}),
        ...(typeof item.index === "number" ? { index: item.index } : {}),
      }));
      continue;
    }
    safe[key] = typeof value === "string" ? sanitizeText(value, parameterTextLimit(key)) : value;
  }
  return safe;
}

export function sanitizeText(value: string, maxLength = MAX_TEXT_LENGTH) {
  let safe = value.trim();
  for (const pattern of piiPatterns) safe = safe.replace(pattern, "[redacted]");
  return safe.slice(0, maxLength);
}

function parameterTextLimit(key: string) {
  if (key === "page_location") return 1000;
  if (key === "page_path" || key === "page_title") return 300;
  if (key === "link_url") return 500;
  return MAX_TEXT_LENGTH;
}

// Normalize before constructing cache keys so equivalent requests share an entry.
export const CATALOG_TTL = { detail: 43_200, list: 3_600, search: 300, sitemap: 86_400 } as const;
export const MAX_CATALOG_PAGE = 2_000;

export function boundedInteger(value: number, fallback: number, maximum: number) {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(1, Math.floor(value))) : fallback;
}

export function catalogPagination(page: number, perPage: number, maximum = 48) {
  return {
    page: boundedInteger(page, 1, MAX_CATALOG_PAGE),
    perPage: boundedInteger(perPage, 24, maximum),
  };
}

export function normalizeSearchQuery(query: string) {
  // Let Postgres apply its own search collation. Turkish lowercasing would turn
  // an English game title such as MARIO into marıo and change existing matches.
  return query.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 80);
}

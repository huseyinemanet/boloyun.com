# Performance And Cache

## PC-1: Public homepage is dynamic due to profile and dynamic settings/sections

Severity: **P1**
Status: **FAIL**
Required before launch: **Yes, for Cloudflare Free public traffic constraint**

Exact evidence:
- `src/app/(public)/page.tsx:13` sets `force-dynamic`.
- `src/app/(public)/page.tsx:38-44` fetches games, settings, homepage sections and current profile.
- `src/app/(public)/page.tsx:45` filters member-only sections using `profile`.

Exploit or failure scenario:
The homepage cannot be a simple CDN object because it includes per-user logic. Anonymous homepage traffic triggers dynamic rendering and Worker/server execution.

Recommended remediation:
Make the public homepage anonymous/static by default. Move member-only sections into an authenticated client island or `/api/me/homepage` endpoint loaded only for signed-in users.

Expected performance or quota impact:
High positive. Homepage is likely a top traffic route.

## PC-2: Public game detail page mixes cacheable content with user state

Severity: **P1**
Status: **FAIL**
Required before launch: **Yes, for 26,000-game scale**

Exact evidence:
- `src/app/(public)/oyun/[slug]/page.tsx:40` sets `force-dynamic`.
- `src/app/(public)/oyun/[slug]/page.tsx:81-87` reads cookie/profile-specific vote/favorite state.
- `src/app/(public)/oyun/[slug]/page.tsx:83-91` issues multiple per-page queries.
- `src/app/(public)/oyun/[slug]/page.tsx:168-180` embeds a client player and server action for play tracking.

Exploit or failure scenario:
Every public game page view performs runtime work even before the user clicks `Oyunu Başlat`.

Recommended remediation:
Separate static game content from user state. Render favorite/vote/comment forms as progressive dynamic widgets and keep the main page cacheable.

Expected performance or quota impact:
Very high positive.

## PC-3: Client autocomplete self-fetches dynamic `/api/search`

Severity: **P2**
Status: **PARTIAL**
Required before launch: **No, but optimize before scale**

Exact evidence:
- `src/components/layout/search-autocomplete.tsx:44` fetches `/api/search?q=...`.
- `src/components/layout/search-autocomplete.tsx:139` fetches `/api/search?popular=1`.
- `src/app/api/search/route.ts:5` sets `force-dynamic`.
- `src/app/api/search/route.ts:16-17` rate-limits every request in the database.
- `src/app/api/search/route.ts:23-30` returns `s-maxage=60`.

Exploit or failure scenario:
Normal typing can create many Worker/API and DB rate-limit calls. The in-memory client cache helps only per browser session.

Recommended remediation:
Keep debounce and client cache, but consider:
- Static popular suggestions embedded in layout.
- Edge/CDN cacheable public suggestions without DB rate-limit writes for cache hits.
- A search backend/index or Postgres full-text/trigram indexes before high traffic.

Expected performance or quota impact:
Medium positive if optimized.

## PC-4: Search query pattern is costly for large content

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended before launch**

Exact evidence:
- `src/lib/db-games.ts:628-639` performs three `ilike '%query%'` searches across `title`, `short_description`, and `long_description`.
- `src/lib/db-games.ts:666-672` autocomplete performs `ilike` on `title` ordered by `play_count`.
- Migration index evidence does not show trigram/full-text indexes for these `ilike` patterns.

Exploit or failure scenario:
Wildcard `ilike` over 26,000 games can become slow and expensive under user typing or bot traffic, especially on descriptions.

Recommended remediation:
Add a search-specific strategy:
- Postgres full-text search with generated `tsvector` and GIN index, or
- `pg_trgm` GIN indexes for title/autocomplete.
Keep result limits and rate limits.

Expected performance or quota impact:
Medium to high positive for search responsiveness and DB load.

## PC-5: Admin popular games helper scans all favorites

Severity: **P2**
Status: **PARTIAL**
Required before launch: **No**

Exact evidence:
- `src/lib/db-games.ts:254-270` fetches top 400 played games, top 400 liked games, and all rows from `favorites`.
- `src/lib/db-games.ts:272-276` counts favorites in application memory.

Exploit or failure scenario:
As favorites grow, admin dashboard load becomes expensive and can time out or consume memory.

Recommended remediation:
Replace all-favorites fetch with a grouped SQL/RPC query for top favorite counts.

Expected performance or quota impact:
Low public impact; medium admin performance improvement.

## PC-6: Cache tags exist for public data

Severity: **P2**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `src/lib/db-games.ts:189-205` uses `unstable_cache` for published game cards with tag `games`.
- `src/lib/db-games.ts:555-573` caches published game by slug.
- `src/lib/db-games.ts:576-612` caches game detail with tags `games`, `categories`, `tags`.
- `src/lib/db-settings.ts:145-161` caches public settings with tag `site-settings`.
- Admin actions call `revalidateTag`, for example `src/app/admin/games/actions.ts:77-80`.

Exploit or failure scenario:
N/A. Cache primitives exist. The problem is that page-level dynamic user/cookie work still prevents public pages from being purely static/CDN.

Recommended remediation:
Preserve data caches while restructuring public pages to avoid per-request user state.

Expected performance or quota impact:
Positive, but currently limited by dynamic route architecture.

## PC-7: Middleware convention deprecated in Next 16

Severity: **P2**
Status: **PARTIAL**
Required before launch: **No**

Exact evidence:
- `src/middleware.ts:4-32` exports `middleware`.
- `pnpm build` output warns: `"middleware" file convention is deprecated. Please use "proxy" instead.`

Exploit or failure scenario:
Not a direct security issue. It is a future compatibility and maintenance issue.

Recommended remediation:
After removing public-route middleware, migrate remaining middleware to Next 16 `proxy.ts` conventions.

Expected performance or quota impact:
Depends on matcher reduction; migration itself has low impact.


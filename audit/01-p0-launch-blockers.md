# P0 Launch Blockers

## P0-1: Public content is served through a global Cloudflare Worker

Severity: **P0**
Status: **FAIL**
Required before launch: **Yes**

Exact evidence:
- `wrangler.jsonc:4-10`
  - `main` points to `.open-next/worker.js`.
  - `routes` include `boloyun.com/*` and `www.boloyun.com/*`.
- `src/middleware.ts:35-37`
  - Middleware matches `/((?!_next/static|_next/image|favicon.ico).*)`, covering normal public pages.
- `src/middleware.ts:19-31`
  - Middleware creates a Supabase server client and calls `supabase.auth.getUser()`.
- `src/app/(public)/page.tsx:13`
  - Homepage is `force-dynamic`.
- `src/app/(public)/oyun/[slug]/page.tsx:40`
  - Public game pages are `force-dynamic`.
- `src/app/(public)/arama/page.tsx:7`
  - Public search page is `force-dynamic`.
- `package.json:9-11`
  - Cloudflare build/deploy uses `opennextjs-cloudflare`.

Exploit or failure scenario:
An ordinary crawl or traffic spike across 26,000 game pages invokes the Cloudflare Worker for each normal page request. This consumes Cloudflare Free Worker request/CPU budget for anonymous public browsing. Because the Worker route is `boloyun.com/*`, even pages that could be static are still Worker-routed unless served as assets by OpenNext internals.

Recommended remediation:
1. Remove the global Worker route for public HTML.
2. Keep Worker/Pages Function usage only for dynamic surfaces:
   - `/admin/*`
   - `/auth/*`
   - `/api/*`
   - upload and crawler endpoints
   - server actions or mutation endpoints
3. Make public game/category/tag/static pages CDN-cacheable or pre-rendered.
4. Remove auth/session refresh middleware from anonymous public routes.
5. Re-check `pnpm build` and Cloudflare routing until normal public pages do not require Worker execution.

Expected performance or quota impact:
Very high. This is the main change needed to keep normal public traffic on CDN/static assets rather than Worker invocations.

Required before launch:
**Yes.** This directly violates the project constraint.

## P0-2: 26,000 public game pages have no static generation strategy

Severity: **P0**
Status: **FAIL**
Required before launch: **Yes**, if launch requires 26,000 games under Cloudflare Free without Worker traffic.

Exact evidence:
- `src/app/(public)/oyun/[slug]/page.tsx:40`
  - `export const dynamic = "force-dynamic";`
- `src/app/(public)/oyun/[slug]/page.tsx:69-91`
  - The page reads cookies/current profile and fetches comments, vote state, favorite state, related games and recent games at request time.
- `src/app/(public)/oyun/[slug]/page.tsx:81-87`
  - Cookie and user-specific favorite/vote reads force per-request rendering.
- `pnpm build` output:
  - `/oyun/[slug]` is dynamic `ƒ`, not static.

Exploit or failure scenario:
Search engines, social crawlers, or users hitting game pages generate per-request server rendering for every game detail URL. This increases TTFB, database load, and Worker quota usage at the highest-volume route.

Recommended remediation:
Split the game page into:
- Static or cached public shell: title, metadata, thumbnail, text content, player placeholder, categories, tags, related games.
- Dynamic-on-interaction pieces: play count write, favorite state, vote state, comment submit, authenticated widgets.

Do not read `cookies()` or `getCurrentProfile()` in the static public game page shell. Use client-side authenticated endpoints or separate dynamic islands only where needed.

Expected performance or quota impact:
Very high. Static/CDN game pages are the largest lever for 26,000-game scale.

Required before launch:
**Yes**, for the stated Cloudflare Free constraint.


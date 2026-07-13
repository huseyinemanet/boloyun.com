# Cloudflare Free Budget

## CF-1: Global Worker route captures all site traffic

Severity: **P0**
Status: **FAIL**
Required before launch: **Yes**

Exact evidence:
- `wrangler.jsonc:4-10` routes `boloyun.com/*` and `www.boloyun.com/*` to `.open-next/worker.js`.
- `wrangler.jsonc:11-14` binds static assets under `.open-next/assets`, but the Worker remains the route entry point.
- `open-next.config.ts:1-3` uses the default OpenNext Cloudflare config with no public-route exclusion.

Exploit or failure scenario:
Normal public pages consume Worker quota and CPU. Free-plan limits can be exhausted by crawler traffic, repeated category pagination, or users browsing game detail pages.

Recommended remediation:
Use Cloudflare as reverse proxy/CDN for static HTML/assets and restrict Worker route patterns to dynamic paths. If OpenNext cannot selectively bypass the Worker for public HTML in this deployment mode, change the hosting strategy for public pages.

Expected performance or quota impact:
High positive. Removes Worker invocation from the main traffic path.

## CF-2: Middleware performs Supabase auth on almost every route

Severity: **P1**
Status: **FAIL**
Required before launch: **Yes**, if middleware remains attached to public routes.

Exact evidence:
- `src/middleware.ts:35-37` excludes only `_next/static`, `_next/image`, and `favicon.ico`.
- `src/middleware.ts:19-31` creates a Supabase SSR client and calls `supabase.auth.getUser()`.

Exploit or failure scenario:
Anonymous requests to public content still execute middleware and may perform auth/session refresh work. At scale, this adds unnecessary edge/server cost before the actual page render.

Recommended remediation:
Narrow middleware/proxy matching to auth/admin/dynamic-only paths or remove it entirely from public content. In Next 16, plan migration from `middleware.ts` to `proxy.ts`.

Expected performance or quota impact:
High positive. Fewer edge invocations and less auth overhead for anonymous browsing.

## CF-3: Build output confirms dynamic public routes

Severity: **P1**
Status: **FAIL**
Required before launch: **Yes**, for quota requirement.

Exact evidence:
- `src/app/(public)/page.tsx:13` homepage is dynamic.
- `src/app/(public)/oyun/[slug]/page.tsx:40` game pages are dynamic.
- `src/app/(public)/arama/page.tsx:7` search is dynamic.
- Build output lists `/`, `/oyun/[slug]`, `/kategori/[slug]`, `/etiket/[slug]`, `/arama`, `/sayfa/[slug]` as `ƒ`.

Exploit or failure scenario:
The homepage, game detail pages, category pages, tag pages, search pages, and static pages are not built as static CDN objects, so page traffic depends on runtime compute.

Recommended remediation:
Convert public content pages to static, ISR, or cache-first route handlers that can be served from CDN without Worker execution. Remove cookie/profile reads from public page shells.

Expected performance or quota impact:
High positive. Reduces origin/server rendering and database reads.

## CF-4: Next/Image runtime transformation is avoided for game thumbnails

Severity: **P2**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `src/components/game/game-card.tsx:10-15` uses `Image` with `unoptimized`.
- `src/app/(public)/oyun/[slug]/page.tsx:133-136` uses `Image` with `unoptimized`.
- `src/components/layout/search-autocomplete.tsx:211-213` uses `Image` with `unoptimized`.

Exploit or failure scenario:
N/A. This avoids Next image optimizer runtime transformation cost for high-volume thumbnail traffic.

Recommended remediation:
Keep thumbnails on R2/CDN with immutable caching. Do not route high-volume thumbnail transformation through Next/OpenNext.

Expected performance or quota impact:
Positive. Avoids runtime image optimizer cost.

## CF-5: Upload image transformations use Cloudflare Images binding

Severity: **P2**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `wrangler.jsonc:21-23` configures an `IMAGES` binding.
- `src/lib/r2.ts:37-44` calls Cloudflare Images info/input/output during upload.

Exploit or failure scenario:
N/A for normal page traffic. Transform cost occurs during uploads, not normal browsing.

Recommended remediation:
Keep upload transformations admin/user-action only. Do not transform images during public page reads.

Expected performance or quota impact:
Low for public traffic; bounded to upload operations.


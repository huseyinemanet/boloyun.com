# Executive Summary

Audit date: 2026-07-13

Scope: read-only production security and architecture audit of the Bol Oyun Next.js App Router repository. No source or configuration files were modified. Only this `audit/` report set was created.

## Overall Launch Verdict

**Status: PARTIAL**

The application has a solid baseline for application security: admin routes are protected through a shared admin shell, mutation routes/actions generally require authenticated admin access, uploads are signature-checked and re-encoded, Supabase RLS exists, privileged RPCs are service-role only, and local quality gates pass.

However, there is one launch blocker for the stated production architecture: **normal public page traffic currently invokes the Cloudflare Worker**. `wrangler.jsonc` routes all `boloyun.com/*` traffic to `.open-next/worker.js`, the middleware matcher covers nearly every non-static path, and the build output shows the homepage, game pages, category pages, tag pages, search, and static-page routes are dynamic.

## P0 Launch Blockers

### P0-1: Public HTML traffic is routed through the OpenNext Worker

Severity: **P0**
Status: **FAIL**
Required before launch: **Yes**

Evidence:
- `wrangler.jsonc:4-10` sets `main` to `.open-next/worker.js` and registers `boloyun.com/*` and `www.boloyun.com/*`.
- `src/middleware.ts:35-37` matches every non-static path except `_next/static`, `_next/image`, and `favicon.ico`.
- `src/middleware.ts:19-31` creates a Supabase server client and calls `supabase.auth.getUser()` in middleware.
- `src/app/(public)/page.tsx:13` sets the homepage to `force-dynamic`.
- `src/app/(public)/oyun/[slug]/page.tsx:40` sets game detail pages to `force-dynamic`.
- `src/app/(public)/arama/page.tsx:7` sets search to `force-dynamic`.
- `pnpm build` output lists `/`, `/oyun/[slug]`, `/kategori/[slug]`, `/etiket/[slug]`, `/arama`, `/sayfa/[slug]`, and most app routes as dynamic `ƒ`, plus `ƒ Proxy (Middleware)`.

Failure scenario:
With approximately 26,000 games, bots and users requesting game pages generate Worker invocations for normal public page views. This directly violates the requirement that Cloudflare Free limits must not be consumed by normal page traffic and that public game traffic should not invoke a Worker or Pages Function.

Recommended remediation:
Move public content delivery to static or CDN-cached HTML. Options:
- Use static generation or export for public game/category/tag/static pages and avoid global Worker routing for public HTML.
- Restrict Worker routes to admin, auth, APIs, mutations, image/upload, and other truly dynamic endpoints.
- Remove public paths from middleware/proxy and avoid Supabase auth refresh on anonymous public routes.
- Split user-specific widgets into small dynamic endpoints or client-only actions that run only after interaction.

Expected performance or quota impact:
Very high positive impact. Public page views become cache hits instead of Worker invocations, protecting Cloudflare Free quotas and reducing time to first byte.

## High-Level Area Status

| Area | Status | Summary |
|---|---:|---|
| Next.js version | PASS | Next 16.2.10, React 19.2.4, App Router structure. Build passes. |
| App Router architecture | PARTIAL | App Router is used, but public routes are dynamic and Worker-bound. |
| Server/Client boundaries | PARTIAL | Client components are mostly local; public layouts pull auth/settings server work into all pages. |
| Server Actions/Route Handlers | PARTIAL | Admin checks are present; several handlers lack explicit origin checks or schema validation. |
| Authentication/authorization | PASS | Admin layout and actions require admin; blocked users handled. |
| IDOR/object ownership | PARTIAL | Avatar ownership and favorite/comment ownership are good; admin service-role paths rely on app checks. |
| DAL/server-only | PARTIAL | Sensitive helpers are server-only in some files; service client factory itself is importable from mixed module. |
| Input validation | PARTIAL | Many manual checks; no central Zod schemas despite dependency availability. |
| XSS/sanitization | PARTIAL | React escaping used; SVG sanitizer exists; admin ad HTML is intentionally raw and CSP allows unsafe inline/https. |
| Iframe isolation | PARTIAL | Games load after click and iframe sandbox exists; `allow-same-origin` weakens isolation. |
| postMessage | N/A | No `postMessage` usage found. |
| Upload validation | PASS | Uploads validate type, size, signatures, dimensions, animation, and re-encode. |
| Cache/user leakage | PARTIAL | User-specific data makes public pages dynamic; no clear shared-cache leak found. |
| Cloudflare budget | FAIL | All-site Worker route conflicts with requirement. |
| Rate limiting | PARTIAL | DB-backed limits exist; public search and public game actions still invoke server/DB per interaction. |
| Turnstile | PARTIAL | Risk-based only after rate limits; not a hard gate for signup/login/recovery. |
| Env/secrets | PASS | Secrets are not hardcoded; `NEXT_PUBLIC_` use is appropriate for Supabase URL/anon and Turnstile site key. |
| Security headers/CSP | PARTIAL | Basic headers exist, but CSP is broad and allows inline/any https scripts and frames. |
| Database/indexes | PARTIAL | Several indexes and RPC hardening exist; search and some admin counts are still costly. |
| Build strategy for 26k pages | FAIL | No `generateStaticParams` or static public-game generation; build shows dynamic public game pages. |
| Logging/audit logging | PARTIAL | Admin audit table exists for selected admin actions; not every mutation is audited. |
| Backup/restore | PARTIAL | Migrations exist; no repo evidence of backup/restore drills or runbooks. |
| Dependency vulnerabilities | PASS | `pnpm audit --audit-level moderate` returned no known vulnerabilities. |
| Error handling | PARTIAL | Good generic UI exists; some APIs return 200 for errors or expose operational messages to admins. |
| Health/monitoring | PARTIAL | Observability is enabled in Wrangler, but no health route or uptime checks were found. |
| Tests/CI gates | PARTIAL | Local checks pass; no `.github/workflows` found in repo. |

## Verification Run

Commands run:
- `pnpm audit --audit-level moderate`: passed, no known vulnerabilities.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 34 tests.
- `pnpm build`: passed. Build output confirms dynamic public routes and deprecated middleware convention.


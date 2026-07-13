# Remediation Roadmap

## Phase 0: Launch Blockers

### 1. Remove public traffic from Worker path

Severity: **P0**
Status: **FAIL**
Required before launch: **Yes**

Evidence:
- `wrangler.jsonc:4-10`
- `src/middleware.ts:35-37`
- `src/app/(public)/page.tsx:13`
- `src/app/(public)/oyun/[slug]/page.tsx:40`

Remediation:
- Restrict Cloudflare Worker routes to dynamic/admin/API paths.
- Make public HTML static/CDN-cached.
- Remove middleware from public paths.

Expected impact:
Very high quota and latency improvement.

### 2. Split public game pages into static shell plus dynamic widgets

Severity: **P0**
Status: **FAIL**
Required before launch: **Yes**

Evidence:
- `src/app/(public)/oyun/[slug]/page.tsx:81-91` mixes cookie/profile state with public content.

Remediation:
- Static shell: metadata, descriptions, thumbnail, taxonomy, player placeholder.
- Dynamic widgets: favorite/vote/comment/play count after user interaction.

Expected impact:
Very high. Makes 26,000 game pages viable.

## Phase 1: Security Hardening

### 3. Add trusted-origin checks to all admin JSON mutations

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended**

Evidence:
- `src/app/api/admin/users/route.ts:8-13`
- `src/app/api/admin/static-pages/route.ts:11-16`
- `src/app/api/admin/ai/process/route.ts:5-9`

Remediation:
Call `hasTrustedMutationOrigin(request)` before processing body.

Expected impact:
Low runtime cost, improved CSRF resilience.

### 4. Add mutation guard for public game actions

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended**

Evidence:
- `src/app/(public)/oyun/[slug]/actions.ts:17-103`

Remediation:
Add origin validation and shared input schemas for comments, votes, favorites, and play tracking.

Expected impact:
Low runtime cost, reduced abuse risk.

### 5. Tighten CSP and ad execution model

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Yes if ads enabled**

Evidence:
- `next.config.ts:20`
- `src/components/ads/ad-slot.tsx:12-20`
- `src/lib/db-ads.ts:133-160`

Remediation:
Replace broad `script-src 'self' 'unsafe-inline' https:` with exact allowlists/nonces/hashes. Consider sandboxed ad iframes.

Expected impact:
Improved XSS blast-radius control; possible ad performance improvement.

### 6. Use per-source iframe sandbox policies

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended**

Evidence:
- `src/components/player/game-player.tsx:144-153`

Remediation:
Default to a stricter sandbox and add capabilities only for reviewed sources.

Expected impact:
No quota impact; safer game embeds.

## Phase 2: Scale And Data

### 7. Add search indexes or a search-specific backend

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended**

Evidence:
- `src/lib/db-games.ts:628-639`
- `src/lib/db-games.ts:666-672`

Remediation:
Use Postgres full-text or `pg_trgm` indexes for game search/autocomplete.

Expected impact:
Medium to high DB performance improvement.

### 8. Replace admin favorite scan with grouped query/RPC

Severity: **P2**
Status: **PARTIAL**
Required before launch: **No**

Evidence:
- `src/lib/db-games.ts:254-276`

Remediation:
Add an RPC/query that returns top favorite counts grouped by `game_id`.

Expected impact:
Admin performance improvement as favorites grow.

### 9. Complete admin audit coverage

Severity: **P2**
Status: **PARTIAL**
Required before launch: **No**

Evidence:
- Existing audit in `src/app/admin/imports/actions.ts:17-20`, `38-55`, `71-75`
- Existing audit in `src/app/admin/settings/actions.ts:18-25`, `31-47`
- Missing audit in `src/app/admin/games/actions.ts:11-82`
- Missing audit in `src/app/admin/ads/actions.ts:29-110`

Remediation:
Log game, ad, category, tag, static-page, and crawler mutations.

Expected impact:
Low runtime cost, better incident response.

## Phase 3: Release Operations

### 10. Add CI gates

Severity: **P1**
Status: **FAIL**
Required before launch: **Recommended**

Evidence:
- No `.github/workflows` files found.
- `package.json:14-16` defines local checks.

Remediation:
Add CI running install, typecheck, lint, test, build, and migration validation.

Expected impact:
No runtime impact.

### 11. Add health and restore readiness

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended**

Evidence:
- `wrangler.jsonc:28-31` enables observability.
- No health route or backup/restore runbook found.

Remediation:
Add `/api/health` or external health checks, Supabase/R2 restore runbooks, and periodic restore drills.

Expected impact:
Improved operational confidence.


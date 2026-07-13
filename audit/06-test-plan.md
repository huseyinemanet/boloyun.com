# Test Plan

## Current Quality Gate Evidence

Severity: **P2**
Status: **PASS**
Required before launch: **No, but keep as release gate**

Commands run on 2026-07-13:
- `pnpm audit --audit-level moderate`: no known vulnerabilities.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 34 tests.
- `pnpm build`: passed.

Build evidence:
- `package.json:14-16` defines `lint`, `typecheck`, and `test`.
- `package.json:8` defines `build`.
- `pnpm build` output confirms Next.js 16.2.10 and successful production build.

## CI Quality Gate Missing

Severity: **P1**
Status: **FAIL**
Required before launch: **Recommended before launch**

Exact evidence:
- No `.github/workflows` files were found in the repository.
- `package.json:14-16` defines checks, but repo evidence does not show they run automatically on push/PR.

Failure scenario:
A production push can bypass lint, typecheck, tests, build, Supabase dry-run, or migration checks.

Recommended remediation:
Add CI with:
- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Supabase migration validation for migration changes.

Expected performance or quota impact:
No runtime impact. Reduces release risk.

## Required Security Regression Tests

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended before launch**

Add tests for:
- Non-admin cannot access admin page data.
- Non-admin cannot call each admin route handler.
- Non-admin cannot invoke each admin Server Action.
- Cross-origin POSTs are rejected on all mutation route handlers.
- Public game mutations rate-limit correctly.
- Blocked users cannot comment, upload avatar, favorite, or vote.
- Service-role helpers are never imported into client components.
- AI translation output cannot overwrite game titles or inject HTML.
- Ad code changes create audit events.

Relevant evidence:
- `src/components/admin/admin-shell.tsx:5-7` protects admin pages.
- `src/app/api/admin/users/route.ts:8-13`, `src/app/api/admin/static-pages/route.ts:11-16`, `src/app/api/admin/ai/process/route.ts:5-9` need route-level CSRF/origin coverage.
- `src/app/(public)/oyun/[slug]/actions.ts:17-103` needs public mutation coverage.

Expected performance or quota impact:
No runtime impact.

## Required Performance Regression Tests

Severity: **P1**
Status: **FAIL**
Required before launch: **Yes, for public traffic constraint**

Add tests/checks for:
- Public homepage does not invoke Worker/function in production architecture.
- Public game page can be served as CDN/static HTML.
- `/oyun/[slug]` does not read cookies/profile in the public shell.
- Search autocomplete is bounded under typing bursts.
- Sitemap generation handles 26,000 games without long DB scans.
- No public route imports `getCurrentProfile()` unless intentionally dynamic.

Relevant evidence:
- `src/app/(public)/page.tsx:13`, `36-44`.
- `src/app/(public)/oyun/[slug]/page.tsx:40`, `81-91`.
- `src/components/layout/search-autocomplete.tsx:44`, `139`.
- `src/app/api/search/route.ts:16-27`.

Expected performance or quota impact:
High positive if enforced.

## Operational Tests

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended before launch**

Add runbooks/tests for:
- Supabase migration dry-run: `supabase db push --dry-run`.
- Remote migration list check after deploy.
- Database smoke query after deployment.
- R2 upload/read/delete smoke test.
- Restore drill for database and R2 assets.
- Health endpoint and uptime monitor.
- Admin audit log smoke test after each sensitive admin mutation.

Relevant evidence:
- `AGENTS.md` release workflow requires Supabase dry-run and deployment verification.
- `wrangler.jsonc:28-31` enables Cloudflare observability.
- No dedicated health route was found.

Expected performance or quota impact:
Low.


# Next.js Security

## NS-1: Admin route authorization is centralized

Severity: **P1**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `src/app/admin/layout.tsx:10-14` wraps admin content in `AdminShell`.
- `src/components/admin/admin-shell.tsx:5-7` calls `requireAdmin()`.
- `src/lib/auth.ts:86-91` allows only active admin profiles and redirects others.

Exploit or failure scenario:
N/A. Direct navigation to admin pages is protected by the shared layout.

Recommended remediation:
Keep admin pages under this layout. Add a regression test that verifies non-admin requests are redirected or denied.

Expected performance or quota impact:
Low. Admin-only runtime cost is acceptable.

## NS-2: Server Actions generally require admin before writes

Severity: **P1**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `src/app/admin/games/actions.ts:11-13` calls `requireAdmin()` before game updates.
- `src/app/admin/imports/actions.ts:16-20` calls `requireAdmin()` before import approval.
- `src/app/admin/settings/actions.ts:18-25` calls `requireAdmin()` before settings saves and records audit.
- `src/app/admin/users/actions.ts:22-24`, `65-67`, `93-95`, `118-120` call `requireAdmin()`.
- `src/app/admin/comments/actions.ts:23-25`, `29-35`, `46-48` call `requireAdmin()`.

Exploit or failure scenario:
N/A for the checked admin actions. Authorization is not only hidden UI.

Recommended remediation:
Add automated tests for each action family and keep all new mutations behind `requireAdmin()` or `requireProfile()`.

Expected performance or quota impact:
Low.

## NS-3: Admin API handlers lack a consistent mutation-origin check

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended before launch**

Exact evidence:
- `src/app/api/admin/users/route.ts:8-13` requires admin and validates JSON, but does not call `hasTrustedMutationOrigin()`.
- `src/app/api/admin/static-pages/route.ts:11-16` requires admin and validates JSON, but does not call `hasTrustedMutationOrigin()`.
- `src/app/api/admin/ai/process/route.ts:5-9` requires admin and accepts JSON, but does not call `hasTrustedMutationOrigin()`.
- Contrast: `src/app/api/admin/settings/assets/route.ts:11-15` does require admin and origin.

Exploit or failure scenario:
If SameSite cookie behavior or a future auth cookie setting permits credentialed cross-site POSTs, admin JSON endpoints have less CSRF defense than form/auth routes. The risk is reduced by modern cookie defaults and JSON content-type, but defense is inconsistent.

Recommended remediation:
Require `hasTrustedMutationOrigin(request)` on every authenticated POST/PUT/PATCH/DELETE route and every route that triggers expensive admin work.

Expected performance or quota impact:
Negligible.

## NS-4: Public mutation Server Actions do not use explicit origin checks

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended before launch**

Exact evidence:
- `src/app/(public)/oyun/[slug]/actions.ts:17-43` creates comments.
- `src/app/(public)/oyun/[slug]/actions.ts:46-66` records votes.
- `src/app/(public)/oyun/[slug]/actions.ts:68-81` records game plays.
- `src/app/(public)/oyun/[slug]/actions.ts:83-103` toggles favorites.
- These actions validate IDs/rate limits in places, but do not use `hasTrustedMutationOrigin()`.

Exploit or failure scenario:
A malicious page can attempt to submit cross-site forms or trigger action endpoints using a victim browser. Rate limits and auth requirements reduce impact, but explicit origin validation should protect state-changing paths.

Recommended remediation:
Add a common mutation guard for Server Actions or move public mutations to route handlers with trusted-origin checks, rate limits, and schemas.

Expected performance or quota impact:
Low security overhead; possible positive abuse reduction.

## NS-5: Raw ad HTML is rendered publicly

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Yes, if third-party ad code will be enabled**

Exact evidence:
- `src/components/ads/ad-slot.tsx:12-20` renders `ad.ad_code` via `dangerouslySetInnerHTML`.
- `src/lib/db-ads.ts:133-160` stores admin-provided `ad_code` without sanitization.
- `next.config.ts:20` allows inline scripts and scripts from any HTTPS origin.

Exploit or failure scenario:
An admin account compromise, pasted malicious ad script, or compromised ad provider can execute script on public pages. Because CSP allows broad inline/HTTPS scripts, the browser has limited mitigation.

Recommended remediation:
Treat ad HTML as privileged code:
- Add an allowlisted ad provider model where possible.
- Use CSP nonces/hashes and restrict `script-src` to exact ad domains.
- Consider rendering ad providers in sandboxed iframes.
- Audit every admin ad-code change.

Expected performance or quota impact:
Potential positive impact if ad scripts are constrained/lazy-loaded. Stronger CSP has no quota cost.

## NS-6: Category SVG sanitizer exists but is custom

Severity: **P2**
Status: **PARTIAL**
Required before launch: **No, but recommended**

Exact evidence:
- `src/components/icons/category-icon.tsx:17-38` sanitizes `icon_svg` before `dangerouslySetInnerHTML`.
- `src/lib/sanitize/html.ts:5-40` allowlists SVG tags.
- `src/lib/sanitize/html.ts:42-57` allowlists attributes and rejects `url(`, `javascript:`, `data:`, event attributes and namespaced attributes.
- Tests cover SVG sanitizer behavior: `src/lib/settings/settings.test.ts` referenced by test output.

Exploit or failure scenario:
Custom parsers can miss browser-specific SVG quirks. Current sanitizer is fairly strict but should be fuzzed or replaced by a well-maintained sanitizer if SVG upload/code is widely used.

Recommended remediation:
Keep current allowlist strict. Add more tests for malformed SVG, encoded entities, nested tags, and CSS-like payloads. Consider server-side normalization through a proven sanitizer.

Expected performance or quota impact:
Negligible.

## NS-7: JSON-LD rendering is acceptable

Severity: **P2**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `src/components/seo/json-ld.tsx:1-4` renders JSON-LD through `serializeJsonLd`.
- `src/lib/seo/jsonld.ts:62-99` builds structured data from typed fields.
- Test output includes `VideoGame JSON-LD only exposes real developer and rating`.

Exploit or failure scenario:
N/A based on repo evidence. JSON-LD is generated as structured objects rather than raw imported HTML.

Recommended remediation:
Keep JSON serialization escaping in place and continue rejecting raw HTML in game content.

Expected performance or quota impact:
Low.

## NS-8: Game iframe sandbox exists but allows same-origin

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended before launch**

Exact evidence:
- `src/components/player/game-player.tsx:144-153` renders iframe with sandbox.
- `src/components/player/game-player.tsx:151` uses `sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms"`.
- `src/components/player/game-player.tsx:94-105` does not load the game before click.

Exploit or failure scenario:
For third-party game embeds, `allow-scripts` plus `allow-same-origin` can substantially weaken iframe sandboxing for same-origin-hosted content. `allow-popups` and `allow-forms` also broaden capability for untrusted games.

Recommended remediation:
Use per-source sandbox policies. Default to the minimum:
`allow-scripts allow-pointer-lock allow-gamepad` style capability, only adding `allow-same-origin`, popups, or forms for reviewed sources that require them. Consider `referrerPolicy` and explicit `allow` policy per game type/source.

Expected performance or quota impact:
No quota impact. May reduce abuse and popups.

## NS-9: postMessage origin validation is not applicable

Severity: **P2**
Status: **N/A**
Required before launch: **No**

Exact evidence:
- Repository search found no `postMessage` usage.

Exploit or failure scenario:
N/A. There is no message listener/sender to validate.

Recommended remediation:
If future iframe integrations use `postMessage`, require exact `event.origin` allowlists and message schema validation.

Expected performance or quota impact:
N/A.


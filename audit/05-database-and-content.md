# Database And Content

## DB-1: RLS and public policies exist for core tables

Severity: **P1**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `supabase/migrations/0001_initial_schema.sql:217-231` enables RLS on core tables.
- `supabase/migrations/0001_initial_schema.sql:233-238` adds public read policies for published games, active categories/tags, taxonomy links, and published static pages.
- `supabase/migrations/0005_auth_profiles_users.sql:111-153` adds owner/admin policies for profiles, favorites, ratings, and comments.
- `supabase/migrations/20260711120006_move_auth_helpers_private.sql:20-46` replaces admin checks with `private.is_admin()`.

Exploit or failure scenario:
N/A for direct Supabase anon/authenticated reads covered by policies.

Recommended remediation:
Keep RLS tests or Supabase policy tests in CI. Avoid relying on service role for client-side access.

Expected performance or quota impact:
Low.

## DB-2: Service-role server data access bypasses RLS by design

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended before launch**

Exact evidence:
- `src/lib/supabase/client.ts:20-32` creates a Supabase service-role client.
- `src/lib/auth.ts:43-50` uses service role to read profiles after verifying Supabase auth user.
- `src/lib/db-games.ts:742-770` uses service role and privileged RPC for game updates.
- `src/lib/db-comments.ts:175-230` uses service role for admin comment updates/deletes.

Exploit or failure scenario:
If an app route/action misses `requireAdmin()` or passes attacker-controlled IDs to a service-role function, RLS will not stop the write. Current audited admin paths generally do check admin, but the pattern has a high blast radius for future mistakes.

Recommended remediation:
Keep all service-role helpers in `server-only` modules and add tests/static checks that route handlers/actions call auth guards before service-role mutations. Prefer service-role-only RPCs with narrow arguments for sensitive workflows.

Expected performance or quota impact:
Low.

## DB-3: Privileged RPC functions are service-role only

Severity: **P1**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `supabase/migrations/20260711093655_production_readiness_hardening.sql:128-158` defines `consume_rate_limit`.
- `supabase/migrations/20260711093655_production_readiness_hardening.sql:160-186` defines `record_game_play_atomic`.
- `supabase/migrations/20260711093655_production_readiness_hardening.sql:188-232` defines `upsert_game_vote_atomic`.
- `supabase/migrations/20260711093655_production_readiness_hardening.sql:234-278` defines `create_comment_atomic`.
- `supabase/migrations/20260711093655_production_readiness_hardening.sql:357-369` revokes public execution and grants service role.
- `supabase/migrations/20260711114901_harden_atomic_workflows.sql:288-301` revokes/grants additional privileged RPCs.

Exploit or failure scenario:
N/A for direct client RPC execution; public/anon/authenticated roles cannot execute these functions.

Recommended remediation:
Keep RPC grants narrow. Add migration tests or a smoke query after deployment to confirm grants match expected roles.

Expected performance or quota impact:
Positive for consistency and atomicity.

## DB-4: Important uniqueness and pagination indexes exist

Severity: **P2**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `supabase/migrations/20260711093655_production_readiness_hardening.sql:44-49` adds lower-case unique slug/username/source URL indexes.
- `supabase/migrations/20260711093655_production_readiness_hardening.sql:51-62` adds taxonomy, import, comment, play, favorite/rating, and ad indexes.
- `supabase/migrations/20260711155648_optimize_admin_keyset_pagination.sql:1-6` adds keyset pagination indexes.

Exploit or failure scenario:
N/A. These protect duplicates and reduce common query costs.

Recommended remediation:
Add search-specific indexes separately; current indexes do not cover wildcard `ilike`.

Expected performance or quota impact:
Positive.

## DB-5: File upload validation is robust

Severity: **P1**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- `src/app/api/profile/avatar/route.ts:12-29` checks origin, profile, active status, rate limits, settings, and file presence.
- `src/app/api/admin/settings/assets/route.ts:9-21` checks admin, origin, kind, security settings, and file presence.
- `src/lib/r2.ts:25-36` validates allowed MIME, file size, magic signature, dimensions, pixel bounds, and animation.
- `src/lib/r2.ts:37-53` re-encodes through Cloudflare Images and stores WebP in R2 with immutable cache.
- `src/lib/settings/media-validation.ts:3-9` validates image signatures.

Exploit or failure scenario:
N/A for common spoofed MIME/polyglot upload attempts; they are rejected or re-encoded.

Recommended remediation:
Keep upload endpoints out of public page traffic. Add monitoring for failed upload spikes.

Expected performance or quota impact:
Low public impact; upload-only transformation cost.

## DB-6: AI provider keys are stored encrypted

Severity: **P1**
Status: **PASS**
Required before launch: **No**

Exact evidence:
- Test output includes `AI API key şifrelenip geri çözülebilir` and fingerprint masking tests.
- `supabase/migrations/20260712130000_ai_translation_system.sql:1-12` stores `encrypted_api_key` and `key_fingerprint`, not plaintext column names.
- `supabase/migrations/20260712130000_ai_translation_system.sql:98-105` revokes table access from anon/authenticated and grants service role.

Exploit or failure scenario:
N/A based on repo evidence. Do not expose actual key values in logs or UI.

Recommended remediation:
Add periodic key rotation and ensure encryption key backup/restore is documented.

Expected performance or quota impact:
Low.

## DB-7: Admin audit logging is incomplete

Severity: **P2**
Status: **PARTIAL**
Required before launch: **No, but recommended**

Exact evidence:
- `supabase/migrations/20260711114901_harden_atomic_workflows.sql:3-15` creates `admin_audit_events`.
- `src/lib/admin-audit.ts:1-18` inserts audit events.
- `src/app/admin/imports/actions.ts:17-20`, `38-55`, `71-75` records import audits.
- `src/app/admin/settings/actions.ts:18-25`, `31-47` records settings audits.
- `src/app/admin/users/actions.ts:50-55`, `86-87`, `113-114` records user audits.
- No audit calls were found in `src/app/admin/games/actions.ts` or `src/app/admin/ads/actions.ts`.

Exploit or failure scenario:
If an admin or compromised admin changes ads or games, forensic evidence is incomplete.

Recommended remediation:
Record audit events for game create/update/publish, ad slot/ad changes, category/tag changes, static page changes, and crawler starts.

Expected performance or quota impact:
Low.

## DB-8: Backup and restore readiness is not proven in repo

Severity: **P1**
Status: **PARTIAL**
Required before launch: **Recommended before launch**

Exact evidence:
- `supabase/migrations/*` provide reproducible schema history.
- No backup/restore runbook, restore drill, or Supabase backup verification file was found in the repository during audit.

Exploit or failure scenario:
Bad import, accidental deletion, AI translation corruption, or admin error may require point-in-time recovery. Without a tested restore process, recovery time and data loss are unknown.

Recommended remediation:
Document and test:
- Supabase backup/PITR availability for the selected plan.
- R2 bucket backup/versioning strategy.
- Restore drill steps and expected RTO/RPO.
- Rollback for bad AI translation batches.

Expected performance or quota impact:
No runtime impact; operational resilience improvement.


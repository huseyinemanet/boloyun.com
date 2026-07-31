# AGENTS.md

## Project North Star

Bol Oyun is a Turkish-first mini game portal.

The product exists for one primary loop:

```txt
Find game -> open game page -> click "Oyunu Başlat" -> play -> discover another game
```

Everything agents build, remove, optimize or document must protect that loop. Do not turn this project into a generic SaaS dashboard, social network, gamified community platform or infrastructure experiment.

## Current Production Reality

The production website runs on a Hetzner VPS.

Runtime shape:

```txt
User
  -> https://boloyun.com
  -> Nginx
  -> 127.0.0.1:3001
  -> Docker Compose service: boloyun-app
  -> Supabase / object storage / external APIs
```

Deployment shape:

```txt
main push or merge
  -> GitHub Actions quality workflow
  -> pnpm typecheck/lint/test/build/perf:check
  -> Docker image build
  -> image upload to VPS over SSH
  -> sudo /usr/local/sbin/boloyun-deploy <sha>
  -> health check against /robots.txt
  -> keep new container or roll back
```

Key production files:

```txt
.github/workflows/quality.yml
deploy/compose.yml
deploy/server/boloyun-deploy
deploy/server/boloyun-deploy.sudoers
Dockerfile
```

Server-side production state lives outside the repo:

```txt
/opt/boloyun/compose.yml
/opt/boloyun/.env.production
/opt/boloyun/.deploy.env
/opt/boloyun/cache
/usr/local/sbin/boloyun-deploy
```

Do not reintroduce a serverless edge runtime, vendor-specific deploy path, or alternate hosting architecture for the main app unless the project owner explicitly asks for it.

## Product Rules

1. The public site must be fast, compact and easy to use.
2. The public site is Turkish-first.
3. The main action is always **Oyunu Başlat**.
4. English UI labels must not appear on public pages unless they are actual game titles, proper nouns, source names or developer-facing diagnostics.
5. Do not add messaging, followers, feeds, trophies, social graphs or complex achievements unless explicitly requested.
6. User accounts exist only for Google login, favorites, recently played games, comments, ratings and a simple profile.
7. Admin features must be functional, clear and reliable. They should not become visually overdesigned.
8. Imported games must never be auto-published without review unless explicitly requested.
9. The review queue is mandatory for imported content.
10. Performance and playability beat decorative complexity.

## Protected Game Surface Rules

The public game catalog and discovery flow are protected product surfaces.

1. Do not change game data, publication state, taxonomy relations, game queries, game cards, game grids, homepage game sections, game ordering, game limits, game routes, player behavior, or game-related cache/fallback behavior unless the project owner explicitly asks for a game-related change in the current request.
2. Auth, session, header, profile, comments, ratings, favorites, ads, admin, infrastructure, performance, SEO, or styling tasks must not modify, gate, delay, replace, or remove the server-rendered public game lists.
3. Viewer-dependent requests may wait for the viewer state, but public game discovery data must render independently of authentication state.
4. Never replace a real database-backed game list with demo games, build-time fallback games, an empty state, skeletons, or a link-only call to action as an optimization.
5. Preserve the homepage game sections and the `Tüm Oyunlar` card grid. A separate `/oyunlar` archive link is additive and must not replace homepage game cards.
6. Do not couple public game retrieval or rendering to `/api/me`, Supabase Auth refresh, profile loading, or another personalized request.
7. Before completing any non-game task, inspect the full diff for changes to public game routes, homepage game rendering, game data helpers, or game cache keys. Remove those changes unless they were explicitly requested.
8. If a non-game fix genuinely requires touching a protected game surface, stop and obtain explicit approval before editing it. Explain exactly which game behavior or files would change.
9. After any explicitly approved change to a protected game surface, verify both anonymous and authenticated behavior, confirm that homepage game cards are visible, and run a live DOM/card-count check after deployment.
10. Game records in the database must never be permanently deleted. Do not hard-delete or `TRUNCATE` rows from `games`, and do not add code, admin actions, scripts, migrations, foreign-key cascades, cleanup jobs, deduplication flows, or reset commands that can permanently remove game records.
11. When a game must no longer be public, preserve its database row and source metadata and use the existing publish/status/archive mechanism to hide it. Deactivation, rejection, cleanup, deduplication, or re-import work must remain reversible.
12. Before any database migration or bulk game operation, verify that it contains no direct or cascading deletion path for existing game records.

## Tech Stack Rules

Use this stack unless the project owner explicitly changes it:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui and Radix-based primitives
- Supabase Postgres
- Supabase Auth
- Supabase RLS
- S3-compatible object storage/CDN for covers and site assets
- Ruffle for SWF/Flash games
- Node.js CLI scripts for import/crawling
- Docker
- Docker Compose
- Nginx reverse proxy
- Hetzner VPS production runtime
- GitHub Actions for quality checks and production deploy

Do not introduce a new framework, database, ORM, CMS, search service, queue system, hosting platform or backend service without a clear reason and prior approval.

Do not rename existing environment variables just for branding. Runtime compatibility is more important than cosmetic naming. If a variable name is historical but the code depends on it, document the meaning rather than silently changing the key.

## Language Rules

Public UI is Turkish.

Use these labels:

| English | Turkish |
|---|---|
| Play Game | Oyunu Başlat |
| New Games | Yeni Oyunlar |
| Trending | Trend Oyunlar |
| Popular Games | Popüler Oyunlar |
| Random | Rastgele |
| Search | Oyun Ara |
| Favorites | Favoriler |
| Continue Playing | Oynamaya Devam Et |
| Comments | Yorumlar |
| Top Comments | Öne Çıkan Yorumlar |
| Latest Comments | Son Yorumlar |
| Like | Beğendim |
| Dislike | Beğenmedim |
| Add to Favorites | Favorilere Ekle |
| How to Play | Nasıl Oynanır? |
| Controls | Kontroller |
| Features | Özellikler |
| Similar Games | Benzer Oyunlar |

Admin panel text may use technical English internally when it improves developer clarity, but user-facing admin labels should preferably be Turkish.

## Public UI Rules

Target layout:

```txt
Header:
Logo | Search | Random | Profile/Login

Left Sidebar:
Sticky compact category/navigation menu

Main Content:
Game sections, game grids, game detail pages, player, content, comments
```

Design principles:

1. Compact but not cramped.
2. Game thumbnails should be prominent.
3. Do not make the public site look like a generic SaaS dashboard.
4. Do not make the public site look like an outdated chaotic Flash portal.
5. Use modern spacing, clean cards, colorful category icons and fast interactions.
6. Use shadcn/ui as a foundation, not as an obvious default theme.
7. Admin can use shadcn/ui more heavily than public pages.

Sidebar rules:

1. Desktop sidebar should be sticky or fixed.
2. Sidebar should support custom category icons.
3. Category icons can be SVG upload, SVG code or fallback icon.
4. Mobile must not use the fixed desktop sidebar. Use drawer, bottom nav or horizontal category chips.

## Game Player Rules

Every game must have a `game_type`.

Supported values:

```txt
iframe
swf
html5
external
```

Rules:

1. Do not load the actual game before the user clicks **Oyunu Başlat**.
2. Show thumbnail and play button first.
3. For `iframe`, render a sandboxed iframe when possible.
4. For `swf`, use Ruffle.
5. For `html5`, load the HTML5 URL through iframe or an approved loader.
6. For `external`, show an external play action only if embedding is not possible.
7. Always preserve the game source URL.
8. Do not assume all games are Flash.
9. Do not assume all games are iframe-compatible.
10. Admin preview must allow testing whether the game works before approval.

## Import Pipeline Rules

The import pipeline is mandatory:

```txt
discover
scrape
parse
generate_ai_content
pending_review
approve/reject
publish
```

Imported games must go into `game_imports`, not directly into `games`.

Only approved imports may become public games.

Import statuses:

```txt
discovered
scraped
ai_generated
pending_review
approved
rejected
failed
duplicate
needs_fix
```

Do not skip statuses unless there is a clear implementation reason.

## Crawler Rules

1. Use Node.js importer scripts.
2. Start with a source-specific parser for Miniplay.
3. Do not rely only on a generic parser.
4. Prefer this structure:

```txt
src/import/parsers/miniplay.parser.ts
src/import/parsers/generic.parser.ts
```

5. One source site should have one dedicated parser.
6. Store raw source URL.
7. Store source domain.
8. Store detected game type.
9. Store detected iframe/SWF/HTML5/external URLs.
10. Detect duplicates by source URL and slug/title where appropriate.
11. Failed imports must be retryable.
12. Do not crash the full import job because one game fails.
13. Use limits in CLI commands to avoid accidentally importing thousands of pages in one run.

Required commands:

```bash
pnpm import:discover <sitemap-url>
pnpm import:scrape --source miniplay --limit 100
pnpm import:generate-content --limit 50
pnpm import:retry-failed
```

## AI Content Rules

AI is used to generate Turkish game content from imported metadata.

AI must:

1. Write Turkish-first content.
2. Rewrite naturally, not perform literal translation.
3. Keep the language simple enough for children to understand.
4. Avoid spammy SEO stuffing.
5. Never invent unknown developer, release date or platform information.
6. Return strict JSON.
7. Generate:
   - Turkish title
   - Short description
   - Long description
   - How to play
   - Controls
   - Features
   - SEO title
   - SEO description
   - Turkish tags
   - Turkish category suggestions

Expected JSON:

```json
{
  "title_tr": "",
  "short_description_tr": "",
  "long_description_tr": "",
  "how_to_play_tr": "",
  "controls_tr": [],
  "features_tr": [],
  "developer_tr": "",
  "seo_title_tr": "",
  "seo_description_tr": "",
  "tags_tr": [],
  "categories_tr": []
}
```

AI output must be editable in admin before publishing.

AI output must not be published automatically.

## Admin Review Rules

The review queue must allow the admin to:

1. Preview imported game data.
2. Test the actual game player.
3. Edit Turkish content.
4. Edit category and tags.
5. Edit thumbnail.
6. Regenerate AI content.
7. Approve.
8. Reject.
9. Mark as needs fix.

Approval flow:

```txt
pending_review -> approved -> create published game
```

Reject flow:

```txt
pending_review -> rejected
```

Needs-fix flow:

```txt
pending_review -> needs_fix
```

## Database Rules

Use Supabase Postgres.

Core tables:

```txt
profiles
games
categories
tags
game_categories
game_tags
game_imports
homepage_sections
comments
favorites
ratings
game_plays
ad_slots
ads
static_pages
```

Rules:

1. Do not remove core tables without explicit approval.
2. Use UUID primary keys.
3. Use `created_at` and `updated_at` timestamps.
4. Use many-to-many relations for games/categories and games/tags.
5. Do not store category/tag as comma-separated strings in `games`.
6. Do not run ad-hoc production SQL for a schema change that should be reproducible.
7. Create a new file under `supabase/migrations` for schema changes.
8. Never edit an already-applied production migration; add a new migration instead.

Before pushing a database migration:

```bash
supabase db push --dry-run
supabase migration list
```

After deployment, verify the migration appears remotely and run the relevant database smoke query.

## Supabase Query Cost Guardrails

Treat every public-page query, RPC, crawler query and scheduled database job as a production cost surface.

1. Before adding or materially changing a high-frequency query or RPC, run `EXPLAIN (ANALYZE, BUFFERS)` with representative production-like cardinality. Record execution time, rows, loops, shared blocks and temp blocks; do not ship an unexplained temp read/write or unbounded scan on a request path.
2. Check `pg_stat_statements` before and after database-sensitive deployments. Review at least `calls`, `total_exec_time`, `mean_exec_time`, `shared_blks_read`, `temp_blks_read` and `temp_blks_written`, ordered both by total cost and per-call cost.
3. Never call `pg_stat_statements_reset()` without explicit owner approval. Historical counters are incident evidence and deployment baselines.
4. Do not materialize, sort or aggregate unbounded `games`, `game_categories`, `game_tags` or recommendation sets during a public request. Use bounded indexed queries, existing cache layers or an explicitly approved precomputed design.
5. Do not calculate RPC payload fields that the application discards, replaces or recomputes. Keep database contracts minimal; when rolling deploy compatibility requires old keys, return a cheap compatible value until all old containers are gone.
6. Database and application rollouts must remain backward-compatible. Apply a compatible database migration first when the old production container must continue working, then deploy the application and remove obsolete contracts only in a later migration.
7. Every regression fix for an expensive query must add an automated test that prevents the costly SQL shape or deprecated RPC call from returning.
8. Before deployment, capture the affected statement counters. After deployment, exercise representative anonymous and authenticated routes, confirm counters over multiple calls, and monitor the 24-hour Disk I/O and timeout trend.
9. A Supabase Disk I/O warning is a production incident. Identify the responsible statement from `pg_stat_statements`, query plans and logs before changing compute, disk or worker frequency.
10. Do not purchase or enable a larger Supabase compute add-on as the first response. Optimize the measured hot path first; any paid capacity change requires explicit owner approval.
11. If CI, migration verification, live route checks, authenticated checks or post-deploy counter checks are blocked or fail, report the work as incomplete. Do not claim production success from local tests or a migration alone.

## Auth and Profile Rules

Use Supabase Auth.

Authentication features:

1. Google login.
2. First-login onboarding.
3. Username selection.
4. Terms acceptance.
5. Optional marketing email toggle.

Do not ask for gender.

Prefer birth year or age confirmation over full birth date unless explicitly required.

Profiles must be simple.

Allowed:

```txt
Avatar
Username
Joined date
Favorites
Recently played
Comments
```

Not allowed unless explicitly requested:

```txt
Messages
Followers
Following
Activity feed
Trophies
Complex achievements
Social graph
```

## Homepage Builder Rules

Homepage sections must be manageable from admin.

Section types:

```txt
manual_games
latest_games
popular_games
trending_games
category_based
tag_based
continue_playing
favorites
random_picks
```

Section settings:

```txt
title
section_type
source_type
source_id
manual_game_ids
limit_count
sort_order
visibility
status
```

The homepage must not be hardcoded beyond the initial fallback state.

## Ad Manager Rules

Ads are slot-based.

Use component:

```tsx
<AdSlot slotKey="game_page_below_player" />
```

Initial slots:

```txt
homepage_top_banner
homepage_between_sections
sidebar_top
sidebar_middle
game_page_top
game_page_below_player
game_page_before_comments
category_page_top
search_results_top
mobile_sticky_bottom
```

Ad rules:

1. Admin can add/edit ad code.
2. Ads can be enabled/disabled.
3. Ads can target desktop/mobile.
4. Ads can have start/end dates.
5. Player experience must not be broken by ads.
6. Mobile sticky ads should hide while game player is active.

## Static Page Rules

Footer must include:

```txt
Terms of Service
Privacy Policy
Cookie Policy
DMCA / Copyright
Contact
About
Advertising
```

Static pages can be database-driven or markdown-driven in the first version.

## SEO Rules

URL structure:

```txt
/
/oyun/[slug]
/kategori/[slug]
/etiket/[slug]
/arama?q=
/sayfa/[slug]
```

SEO rules:

1. Every published game must have an SEO title and description.
2. Every game page must include textual content.
3. Game pages must not be only iframe/player.
4. Category pages must have SEO metadata.
5. Use Turkish slugs for categories where appropriate.
6. Game slugs can preserve original game names.
7. Add canonical URLs.
8. Add Open Graph metadata.

## Performance Rules

1. Public site must be lightweight.
2. Lazy-load thumbnails.
3. Lazy-load game player.
4. Avoid unnecessary client components.
5. Avoid large global JavaScript.
6. Use server components where possible.
7. Cache public content where appropriate.
8. Do not load ads before necessary if they hurt performance.
9. Optimize images.
10. Admin panel can be heavier than public pages.
11. Keep `pnpm perf:check` passing unless the owner explicitly accepts the budget change.

## Security Rules

1. Protect all admin routes.
2. Use Supabase RLS.
3. Sanitize AI output.
4. Sanitize SVG icon input.
5. Do not render imported raw HTML publicly.
6. Validate iframe URLs.
7. Store source URLs.
8. Prevent ordinary users from modifying games, ads, imports, categories or tags.
9. Comments require authentication.
10. Comment moderation is required.
11. Ad code must only be editable by admin.
12. Keep secrets in environment variables only.
13. Never hardcode API keys, service-role keys, SSH keys or provider tokens.

## Code Quality Rules

1. Use TypeScript.
2. Do not use `any` unless unavoidable.
3. Keep components small.
4. Keep public and admin components separated.
5. Keep import/crawler logic separated from UI.
6. Keep AI provider logic abstracted.
7. Use explicit data types.
8. Use clear function names.
9. Add error handling to importer scripts.
10. Add retry logic for failed imports.
11. Do not silently swallow errors.
12. Prefer durable route handlers for deploy-sensitive admin mutations that can be submitted from stale browser tabs.
13. Do not couple public UI behavior to admin-only helpers.

## Environment Rules

Use `.env.example` as the source of required keys.

Core env groups:

```txt
Supabase public/client keys
Supabase service-role key
Object storage/CDN credentials
AI provider credentials
Bot protection credentials
Site URL and deployment version
Abuse-rate-limit hashing secret
Slow-query logging threshold
```

Rules:

1. Never commit `.env.local`, `.env.production`, credentials or uploaded secret files.
2. Production runtime secrets live on the VPS, not in the repository.
3. Build-time public variables are passed through GitHub Actions secrets.
4. Runtime-only secrets are read from `/opt/boloyun/.env.production`.
5. If you add a required variable, update `.env.example`, deployment notes and any relevant workflow/server config together.

## Source Control Rules

Canonical repository:

```txt
https://github.com/huseyinemanet/boloyun.com.git
```

Production branch:

```txt
main
```

For every completed development:

1. Keep the change focused.
2. Review the complete diff before staging.
3. Stage only files related to the task.
4. Run checks appropriate to the change.
5. Never commit credentials, generated build output, `.next`, `node_modules`, provider temp folders or `supabase/.temp`.
6. Commit source code, lockfile changes, config changes and required Supabase migrations together.
7. Push verified work to GitHub when the user asks to update GitHub or the task clearly includes publication.
8. Production changes must reach `main` through an intentional push or merge.

If the user asks for repository presentation work such as README or GitHub About, inspect current metadata first and update GitHub-side description/homepage/topics when requested.

Documentation-only commits may use `[skip ci]` when a production redeploy would add no value.

## Validation Rules

Application changes default gate:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm perf:check
```

Documentation-only changes:

```bash
git diff --check
```

Database migration changes:

```bash
supabase db push --dry-run
supabase migration list
```

Production deploy verification:

```bash
curl -sS -I https://boloyun.com/ | grep -Ei 'HTTP/|server:|location:'
curl -sS -I https://www.boloyun.com/ | grep -Ei 'HTTP/|server:|location:'
```

Expected live shape:

```txt
https://boloyun.com/      -> 200
https://www.boloyun.com/  -> redirect to https://boloyun.com
server                    -> nginx
```

For risky changes, verify the concrete route or workflow the user cares about. Do not declare success from a build alone when live behavior is the point of the task.

## Initial Build Order

Follow this product order when implementing unfinished core pieces:

1. Project setup.
2. Supabase schema/migrations.
3. Public layout: header, sidebar, homepage.
4. Game cards and game detail page.
5. Player system: iframe + Ruffle.
6. Admin auth.
7. Admin games/categories/tags CRUD.
8. Homepage builder.
9. Ad manager.
10. Import database table.
11. Sitemap discover CLI.
12. Miniplay scrape/parser.
13. AI content generation.
14. Review queue UI.
15. Approve/reject flow.
16. Google login and user features.
17. Favorites, recently played, comments, ratings.
18. Polish, performance, SEO.

Do not start with social features.

Do not start with complex gamification.

Do not start by importing thousands of games.

## First Milestone Definition

The first milestone is complete only when:

```txt
The public site opens.
The homepage lists games.
Sidebar categories work.
Search works.
A game detail page opens.
"Oyunu Başlat" loads iframe or Ruffle player.
Admin can create/edit a game.
Admin can create/edit categories and tags.
A sitemap can discover at least 50 game URLs.
At least 10 imported games can enter pending_review.
Admin can approve an imported game.
Approved game appears publicly.
```

## Do Not Do

Do not:

1. Add messaging.
2. Add followers.
3. Add complex achievements.
4. Auto-publish imported games.
5. Make the public site look like a SaaS dashboard.
6. Make the public site heavy.
7. Build a generic crawler before building the Miniplay parser.
8. Store raw imported HTML on public pages.
9. Skip review queue.
10. Use English UI on the Turkish public site.
11. Put game files directly into the Next.js repo if they belong in object storage.
12. Add paid infrastructure unless absolutely required and approved.
13. Over-optimize before the first vertical slice works.
14. Rebuild production deployment around a different hosting model without explicit approval.
15. Touch protected game surfaces during an unrelated task.
16. Make public game visibility depend on authentication, profile availability or personalized API success.
17. Replace homepage game grids with fallback/demo content or navigation-only controls.
18. Permanently delete database game records for cleanup, deduplication, unpublishing, re-importing or any other workflow.

## Guiding Principle

Always prioritize:

```txt
Find game -> open game -> start game -> play game -> discover another game
```

Everything else is secondary.

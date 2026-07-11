# AGENTS.md

## Project Mission

This project is a Turkish-first mini game portal.

The goal is to build a fast, lightweight, SEO-friendly game website where users can discover, search and play browser games. The system must support iframe games, SWF/Flash games through Ruffle, HTML5 games, imported game metadata, AI-generated Turkish content, admin review workflows and configurable ads.

Do not turn this project into a generic social network, heavy SaaS dashboard, or over-engineered platform.

---

## Core Product Rules

1. The public site must be fast, compact and easy to use.
2. The main user action is always: find a game → open game page → click **“Oyunu Başlat”** → play.
3. Public pages must be Turkish-first.
4. English UI labels must not be used on the public website unless they are actual game titles or proper nouns.
5. Do not add social network features unless explicitly requested.
6. Do not add messaging, followers, feeds, trophies or complex achievements unless explicitly requested.
7. User accounts exist only for Google login, favorites, recently played games, comments, ratings and a simple profile.
8. Admin features must be functional and clear, not visually overdesigned.
9. Imported games must never be auto-published without review unless explicitly requested.
10. The review queue is mandatory for imported content.

---

## Tech Stack Rules

Use this stack unless explicitly changed by the project owner:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Postgres
- Supabase Auth
- Cloudflare Pages
- Cloudflare R2
- Ruffle for SWF games
- Node.js CLI scripts for import/crawling

Do not introduce a new framework, database, ORM, CMS, search engine or backend service without a clear reason and prior approval.

---

## Language Rules

The public site is Turkish.

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

Admin panel can use technical English internally only when it improves developer clarity, but user-facing admin labels should preferably be Turkish.

---

## UI Rules

Public layout:

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
3. Do not make the site look like a generic SaaS dashboard.
4. Do not make the site look like an outdated chaotic Flash portal.
5. Use modern spacing, clean cards, colorful category icons and fast interactions.
6. Public site should use shadcn/ui only as a component foundation, not as an obvious default theme.
7. Admin panel can use shadcn/ui more heavily.

Sidebar rules:

1. Desktop sidebar should be sticky or fixed.
2. Sidebar should support custom category icons.
3. Category icons can be SVG upload, SVG code or fallback icon.
4. Mobile should not use fixed desktop sidebar. Use drawer, bottom nav or horizontal category chips.

---

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

1. Do not load the actual game before the user clicks **“Oyunu Başlat”**.
2. Show thumbnail and play button first.
3. For `iframe`, render a sandboxed iframe when possible.
4. For `swf`, use Ruffle.
5. For `html5`, load the HTML5 URL through iframe or approved loader.
6. For `external`, show an external play action only if embedding is not possible.
7. Always preserve the game source URL.
8. Do not assume all games are Flash.
9. Do not assume all games are iframe-compatible.
10. Admin preview must allow testing whether the game works before approval.

---

## Import Pipeline Rules

The import pipeline is mandatory and must follow this sequence:

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

---

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

---

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

---

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
pending_review → approved → create published game
```

Reject flow:

```txt
pending_review → rejected
```

Needs fix flow:

```txt
pending_review → needs_fix
```

---

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

Do not remove core tables without explicit approval.

Use UUID primary keys.

Use timestamps:

```txt
created_at
updated_at
```

Use many-to-many relations for games/categories and games/tags.

Do not store category/tag as comma-separated strings in the `games` table.

---

## Auth Rules

Use Supabase Auth.

Authentication features:

1. Google login.
2. First-login onboarding.
3. Username selection.
4. Terms acceptance.
5. Optional marketing email toggle.

Do not ask for gender.

Prefer birth year or age confirmation over full birth date unless explicitly required.

---

## Profile Rules

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

---

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

---

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

---

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

---

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

---

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

---

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

---

## Code Quality Rules

1. Use TypeScript.
2. Do not use `any` unless unavoidable.
3. Keep components small.
4. Keep public and admin components separated.
5. Keep import/crawler logic separated from UI.
6. Keep AI provider logic abstracted.
7. Use environment variables for secrets.
8. Never hardcode API keys.
9. Write clear function names.
10. Prefer explicit data types.
11. Add error handling to importer scripts.
12. Add retry logic for failed imports.
13. Do not silently swallow errors.

---

## Environment Variables

Use environment variables for:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=

AI_PROVIDER=
AI_API_KEY=

SITE_URL=
```

Never commit secrets.

---

## Source Control And Deployment Workflow

The canonical repository is:

```txt
https://github.com/huseyinemanet/boloyun.com.git
```

The production branch is `main`.

For every completed development:

1. Keep the change focused and review the complete diff.
2. Run the checks appropriate to the change. For application changes, the default gate is:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

3. Never commit `.env.local`, credentials, generated build output, `.wrangler`, or `supabase/.temp`.
4. Commit source code, the lockfile, configuration, and every required Supabase migration together.
5. Push the verified commit to GitHub. Production changes must reach `main` through an intentional push or merge.
6. Verify both deployment tracks separately after the push:
   - Supabase deploys only tracked backend artifacts such as new migrations, configured Edge Functions, and configured Storage buckets.
   - Cloudflare deploys the Next.js/OpenNext application. A successful Supabase deployment does not mean the website itself was deployed.
7. Confirm the live route on `https://boloyun.com` after Cloudflare reports success.

Do not run ad-hoc production SQL for a schema change that should be reproducible. Create a new file under `supabase/migrations`, validate it, and commit it. Never edit an already-applied production migration; add a new migration instead.

Supabase GitHub integration settings for this repository:

```txt
Repository: huseyinemanet/boloyun.com
Production branch: main
Working directory: .
Deploy to production: enabled
Automatic branching: optional; enable only when preview databases are wanted
Supabase changes only: enabled when automatic branching is enabled
```

The Supabase GitHub integration watches the repository but does not deploy the Next.js frontend. Keep Cloudflare's GitHub/Workers deployment connected to `main`, or use the explicit `pnpm cf:deploy` release command when a manual production deployment is requested.

Before pushing a new database migration, use the Supabase CLI safety flow:

```bash
supabase db push --dry-run
supabase migration list
```

After GitHub/Supabase deployment, verify that the migration appears remotely and run the relevant database smoke query. If the Supabase status check fails, do not treat the release as complete and do not bypass the failed migration check.

---

## Initial Build Order

Follow this order:

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

---

## First Milestone Definition

The first milestone is complete only when:

```txt
The public site opens.
The homepage lists games.
Sidebar categories work.
Search works.
A game detail page opens.
“Oyunu Başlat” loads iframe or Ruffle player.
Admin can create/edit a game.
Admin can create/edit categories and tags.
A sitemap can discover at least 50 game URLs.
At least 10 imported games can enter pending_review.
Admin can approve an imported game.
Approved game appears publicly.
```

---

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
11. Put game files directly into the Next.js repo if they belong in R2.
12. Add paid infrastructure unless absolutely required.
13. Over-optimize before the first vertical slice works.

---

## Guiding Principle

Always prioritize this flow:

```txt
Find game → open game → start game → play game → discover another game
```

Everything else is secondary.

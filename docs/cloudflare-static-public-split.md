# Cloudflare Static Public Split

Bol Oyun is split into two deployment targets:

1. Public static site: `apps/public`
2. Dynamic control app: repository root OpenNext/Worker deployment

## Public Cloudflare Pages Project

Create or update the Cloudflare Pages project for `boloyun.com` with:

```txt
Root directory: apps/public
Build command: pnpm build
Build output directory: out
Production branch: main
```

The Pages project must serve normal public traffic for:

```txt
/
/oyun/*
/kategori/*
/etiket/*
/arama
/sayfa/*
/robots.txt
/sitemap.xml
/sitemaps/*
/ads.txt
/llms.txt
```

`apps/public/public/_redirects` handles `www.boloyun.com` to `boloyun.com` without Worker traffic.

## Dynamic Worker Routes

The root Worker must only be routed to:

```txt
/admin*
/api*
/auth*
/profil*
/rastgele*
```

Normal public game/category/tag/page traffic must not match a Worker route.

## Rebuild Hook

Set this environment variable on the dynamic Worker/control app:

```txt
CLOUDFLARE_PAGES_DEPLOY_HOOK_URL=
```

Admin content changes call the deploy hook after the database mutation succeeds. If the hook fails, the database change remains saved and an admin audit event is written.

## Verification

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm public:static-check
pnpm public:build
```

After deployment, verify in Cloudflare metrics that ordinary requests to `/`, `/oyun/*`, `/kategori/*`, `/etiket/*`, `/sayfa/*`, `/robots.txt`, and `/sitemap.xml` do not increment Worker invocations.

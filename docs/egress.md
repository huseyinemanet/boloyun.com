# Supabase egress: rollout and 72-hour verification

Target: approximately 3 GB/month; use 96 MB/day for a 31-day month. Warn above
100 MB/day, critical above 150 MB/day, investigate any day above 300 MB.
These are operational targets, not measured savings or a guarantee.

## Incident evidence (18 September 2026)

See `audit/egress/2026-09-18-audit.md`. Production was still `beecc1a`, Supabase
project `yjoipnnyhpgvzukhrljp` was INACTIVE, and SQL timed out. Do not resume it
before the owner's intended October window. No production migration, deployment,
Nginx reload, cache purge or project resume was performed by this audit.

## Deploy order

1. When the project is intentionally restored, record project-filtered Usage,
   service breakdown and `pg_stat_statements` counters before changes. Do not
   reset counters. Verify the new projection columns and run EXPLAIN on real
   category/tag distributions. The checked-in synthetic plans are not live plans.
2. Run `supabase migration list` and `supabase db push --dry-run` against the
   confirmed boloyun project, then apply the compatible catalogue SELECT revoke
   migration. There is no data deletion. Confirm anon/authenticated Data API GETs
   cannot read games or taxonomy, while service_role can still render catalogue,
   favorites and member pages. Check column grants, views and callable RPCs as
   well: table-level revocation alone does not close any separately granted view
   or column permission. Run Supabase security advisors.
3. Install `deploy/server/nginx/boloyun-egress.conf` as
   `/etc/nginx/conf.d/boloyun-egress.conf` (http context), then the site config.
   Back up the previous files, run `nginx -t`, and only reload after it passes.
   This companion file is mandatory; the site file alone references missing zones.
   Existing production deploy scripts do not install Nginx configuration.
4. Add `SUPABASE_EGRESS_LOG=1` to `/opt/boloyun/.env.production` for the measurement
   window. Enable it in both app and worker. Deploy the reviewed app through the
   existing GitHub Actions flow. Keep `/opt/boloyun/cache` mounted and owned by
   UID 1001. Never purge this cache to deploy a TTL change.
5. Check anonymous AND authenticated homepage cards, category/tag pagination,
   search, game start, favorites and admin review. Check social cover images.
   Repeat requests and measure query deltas: cache hits should perform no
   catalogue DB calls. Private session/member requests are separate.
6. Verify Nginx returns 403 for the explicitly blocked bulk-crawler identities
   and 429 for excessive public requests; assets must remain unaffected. Verify
   spoofed forwarding headers do not bypass the IP limiter. User-Agent is never
   proof of bot identity and there are no trusted-bot rate-limit exemptions.

The new 12-hour game TTL includes ratings/play counters in metadata; optimistic
member interactions remain separate. Admin invalidation still uses existing
`games` tags. A burst of bulk publishing can still invalidate many entries.
Related-game ranking now operates on 250 relation rows per taxonomy pool rather
than 1,000; review recommendation relevance before rollout. The carousel now receives at most 12 games, as requested; existing homepage
grids remain intact.

## Measurement

Keep app/worker Docker logs and `/var/log/nginx/boloyun-access.log` for the same
explicit UTC interval. Existing Nginx wildcard log rotation should cover the new
filename; verify the host's policy and retention. Do not log credentials, cookies
or database response bodies. Nginx keeps source IPs on the host; the report emits
only HMAC hashes. Set a local `EGRESS_AUDIT_HASH_SECRET` if hashes must be stable
across reporting windows; otherwise each run generates its own secret.

```sh
# Run locally on the VPS or stream the files over the existing SSH connection.
# Supply the actual interval, not 24 for a shorter observation.
node scripts/egress-report.mjs --hours=24 < combined-window.log
```

Feed raw timestamped `docker logs` output and the dedicated JSON access logs into
`combined-window.log`. Restrict access to this temporary file. The report keeps
HTTP response bytes and Supabase decoded response bytes separate. It ignores
other Nginx vhosts. No telemetry is reported as unknown, not zero egress.

At 1h, 6h, 24h, 48h and 72h, record:

| UTC interval | Supabase project egress MB | DB/Auth/Storage/Pooler breakdown | HTTP requests | Real analytics pageviews | DB response estimate MB | MB / 1,000 pageviews |
| --- | --- | --- | --- | --- | --- | --- |
| Fill from provider and logs | | | | | | |

`MB / 1,000 pageviews = project egress MB / real pageviews * 1000`. Do not use bot
requests as human pageviews. Query telemetry counts decoded response bodies,
not protocol/header overhead, Auth, direct third-party Data API traffic, Storage
or Supavisor; Supabase Usage is the authoritative budget check. Cancellation or
transport failure can leave a partial response without a completed telemetry
record. A first-hour extrapolation is provisional, especially with cold caches.

Do not call this incident resolved until the project share of the reported
10.93 GB, September 11 service breakdown and 72-hour observed daily budget are
known. Logging was not previously granular enough to assign the old 3.6 GB to
one SQL statement; retain this limitation in the incident record.

## Rollback

Restore the previous Nginx files and syntax-check before reload. Redeploy the
previous signed application image if needed; retain cache storage. Catalogue
reads already used service_role in the old app, so the new SELECT revoke is
compatible. Restore table SELECT grants only if live evidence shows a required
non-service consumer, after reviewing its egress exposure. Disabling telemetry
requires restarting containers with the updated environment.

## Sources

- [Supabase egress measurement and optimization](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [Next.js persistent Data Cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)
- [Next.js self-hosted caching](https://nextjs.org/docs/app/guides/self-hosting)

Supabase's cached-egress counter measures its own CDN hits (typically Storage),
not this VPS's Next.js Data Cache. A zero cached-egress value does not establish
whether application database caching works.

## Reproduce the local cache probe

```sh
BOL_OYUN_PREBUILD_FALLBACK=1 pnpm build
node scripts/egress-cache-smoke.mjs
```

Run with Node 24, the supported major. The probe starts its own localhost mock
Supabase and Next standalone process, asserts zero DB requests on repeated reads,
and stops both. It uses synthetic metadata, not production records or auth.

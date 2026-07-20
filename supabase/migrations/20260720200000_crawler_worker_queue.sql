create table if not exists public.crawler_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  sitemap_url text not null,
  discover_limit integer not null default 100 check (discover_limit between 1 and 5000),
  scrape_limit integer check (scrape_limit between 0 and 500),
  scrape_now boolean not null default true,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  phase text not null default 'discover' check (phase in ('discover', 'process', 'complete')),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  duplicate_checked_count integer not null default 0 check (duplicate_checked_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  pending_discovered_count integer not null default 0 check (pending_discovered_count >= 0),
  target_count integer not null default 0 check (target_count between 0 and 500),
  scraped_count integer not null default 0 check (scraped_count >= 0),
  ai_generated_count integer not null default 0 check (ai_generated_count >= 0),
  pending_review_count integer not null default 0 check (pending_review_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  targets jsonb not null default '[]'::jsonb check (jsonb_typeof(targets) = 'array'),
  target_cursor integer not null default 0 check (target_cursor >= 0),
  message text not null default 'İş kuyruğa alındı.',
  error_message text,
  locked_at timestamptz,
  worker_id text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crawler_jobs_claim_idx
  on public.crawler_jobs (status, locked_at, created_at)
  where status in ('queued', 'running');

create index if not exists crawler_jobs_created_idx
  on public.crawler_jobs (created_at desc);

create unique index if not exists crawler_jobs_single_active_idx
  on public.crawler_jobs ((true))
  where status in ('queued', 'running');

alter table public.crawler_jobs enable row level security;

revoke all on table public.crawler_jobs from anon, authenticated;
grant all on table public.crawler_jobs to service_role;

create or replace function public.claim_crawler_job(p_worker_id text)
returns setof public.crawler_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select job.id
    from public.crawler_jobs job
    where job.status in ('queued', 'running')
      and job.phase <> 'complete'
      and (job.locked_at is null or job.locked_at < clock_timestamp() - interval '5 minutes')
    order by job.created_at asc
    for update skip locked
    limit 1
  )
  update public.crawler_jobs job
  set status = 'running',
      worker_id = p_worker_id,
      locked_at = clock_timestamp(),
      started_at = coalesce(job.started_at, clock_timestamp()),
      updated_at = clock_timestamp()
  from candidate
  where job.id = candidate.id
  returning job.*;
end;
$$;

revoke all on function public.claim_crawler_job(text) from public, anon, authenticated;
grant execute on function public.claim_crawler_job(text) to service_role;

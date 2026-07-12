create table if not exists public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider in ('deepseek', 'openai', 'claude')),
  model text not null,
  encrypted_api_key text,
  key_fingerprint text,
  enabled boolean not null default false,
  last_test_status text not null default 'untested' check (last_test_status in ('untested', 'success', 'failed')),
  last_test_error text,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_translation_jobs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('deepseek', 'openai', 'claude')),
  model text not null,
  batch_size integer not null check (batch_size in (10, 25, 50, 100)),
  status text not null default 'queued' check (status in ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  total_count integer not null default 0 check (total_count >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_translation_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ai_translation_jobs(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  error_message text,
  before_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(before_snapshot) = 'object'),
  output_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(output_snapshot) = 'object'),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, game_id)
);

create table if not exists public.game_translation_state (
  game_id uuid primary key references public.games(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'skipped')),
  provider text check (provider in ('deepseek', 'openai', 'claude')),
  model text,
  translated_at timestamptz,
  source_hash text,
  last_error text,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_translation_jobs_status_created_idx
  on public.ai_translation_jobs (status, created_at desc);

create index if not exists ai_translation_job_items_job_status_idx
  on public.ai_translation_job_items (job_id, status, created_at);

create index if not exists game_translation_state_status_updated_idx
  on public.game_translation_state (status, updated_at desc);

alter table public.ai_provider_configs enable row level security;
alter table public.ai_translation_jobs enable row level security;
alter table public.ai_translation_job_items enable row level security;
alter table public.game_translation_state enable row level security;

drop policy if exists "admins manage ai provider configs" on public.ai_provider_configs;
create policy "admins manage ai provider configs" on public.ai_provider_configs
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "admins manage ai translation jobs" on public.ai_translation_jobs;
create policy "admins manage ai translation jobs" on public.ai_translation_jobs
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "admins manage ai translation job items" on public.ai_translation_job_items;
create policy "admins manage ai translation job items" on public.ai_translation_job_items
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "admins manage game translation state" on public.game_translation_state;
create policy "admins manage game translation state" on public.game_translation_state
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on table public.ai_provider_configs from anon, authenticated;
revoke all on table public.ai_translation_jobs from anon, authenticated;
revoke all on table public.ai_translation_job_items from anon, authenticated;
revoke all on table public.game_translation_state from anon, authenticated;
grant all on table public.ai_provider_configs to service_role;
grant all on table public.ai_translation_jobs to service_role;
grant all on table public.ai_translation_job_items to service_role;
grant all on table public.game_translation_state to service_role;

insert into public.ai_provider_configs (provider, model, enabled)
values
  ('deepseek', 'deepseek-v4-flash', false),
  ('openai', 'gpt-4.1-mini', false),
  ('claude', 'claude-3-5-haiku-latest', false)
on conflict (provider) do nothing;

create or replace function public.ai_translation_source_hash(
  p_short_description text,
  p_long_description text,
  p_how_to_play text,
  p_controls jsonb,
  p_features jsonb,
  p_seo_title text,
  p_seo_description text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select md5(concat_ws(
    chr(31),
    coalesce(p_short_description, ''),
    coalesce(p_long_description, ''),
    coalesce(p_how_to_play, ''),
    coalesce(replace(p_controls::text, ', ', ','), ''),
    coalesce(replace(p_features::text, ', ', ','), ''),
    coalesce(p_seo_title, ''),
    coalesce(p_seo_description, '')
  ));
$$;

create or replace function public.get_ai_translation_candidates(
  p_limit integer,
  p_failed_only boolean default false
)
returns table (
  id uuid,
  title text,
  short_description text,
  long_description text,
  how_to_play text,
  controls jsonb,
  features jsonb,
  seo_title text,
  seo_description text,
  source_hash text
)
language sql
security invoker
set search_path = ''
as $$
  select
    g.id,
    g.title,
    g.short_description,
    g.long_description,
    g.how_to_play,
    g.controls,
    g.features,
    g.seo_title,
    g.seo_description,
    public.ai_translation_source_hash(
      g.short_description,
      g.long_description,
      g.how_to_play,
      g.controls,
      g.features,
      g.seo_title,
      g.seo_description
    ) as source_hash
  from public.games g
  left join public.game_translation_state s on s.game_id = g.id
  where g.status = 'published'
    and (
      (p_failed_only and s.status = 'failed')
      or (
        not p_failed_only
        and (
          s.game_id is null
          or s.status in ('pending', 'failed')
          or s.source_hash is distinct from public.ai_translation_source_hash(
            g.short_description,
            g.long_description,
            g.how_to_play,
            g.controls,
            g.features,
            g.seo_title,
            g.seo_description
          )
        )
      )
    )
  order by
    case when s.status = 'failed' then 0 when s.game_id is null then 1 else 2 end,
    coalesce(s.updated_at, g.updated_at, g.created_at) asc
  limit greatest(0, least(p_limit, 100));
$$;

revoke execute on function public.ai_translation_source_hash(text, text, text, jsonb, jsonb, text, text) from public;
revoke execute on function public.ai_translation_source_hash(text, text, text, jsonb, jsonb, text, text) from anon;
revoke execute on function public.ai_translation_source_hash(text, text, text, jsonb, jsonb, text, text) from authenticated;
grant execute on function public.ai_translation_source_hash(text, text, text, jsonb, jsonb, text, text) to service_role;

revoke execute on function public.get_ai_translation_candidates(integer, boolean) from public;
revoke execute on function public.get_ai_translation_candidates(integer, boolean) from anon;
revoke execute on function public.get_ai_translation_candidates(integer, boolean) from authenticated;
grant execute on function public.get_ai_translation_candidates(integer, boolean) to service_role;

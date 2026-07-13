create table if not exists public.ai_translation_automation (
  id text primary key default 'default' check (id = 'default'),
  enabled boolean not null default false,
  provider text not null default 'deepseek' check (provider in ('deepseek', 'openai', 'claude')),
  daily_target integer not null default 1000 check (daily_target between 1 and 5000),
  per_run_limit integer not null default 2 check (per_run_limit between 1 and 5),
  retry_failed boolean not null default true,
  status text not null default 'idle' check (status in ('idle', 'running', 'disabled', 'error')),
  current_job_id uuid references public.ai_translation_jobs(id) on delete set null,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_translation_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id text not null default 'default' references public.ai_translation_automation(id) on delete cascade,
  job_id uuid references public.ai_translation_jobs(id) on delete set null,
  status text not null check (status in ('skipped', 'completed', 'error')),
  source text not null default 'cron',
  processed_count integer not null default 0 check (processed_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  daily_completed_count integer not null default 0 check (daily_completed_count >= 0),
  message text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

create index if not exists ai_translation_automation_runs_started_idx
  on public.ai_translation_automation_runs (started_at desc);

alter table public.ai_translation_automation enable row level security;
alter table public.ai_translation_automation_runs enable row level security;

drop policy if exists "admins manage ai translation automation" on public.ai_translation_automation;
create policy "admins manage ai translation automation" on public.ai_translation_automation
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "admins manage ai translation automation runs" on public.ai_translation_automation_runs;
create policy "admins manage ai translation automation runs" on public.ai_translation_automation_runs
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on table public.ai_translation_automation from anon, authenticated;
revoke all on table public.ai_translation_automation_runs from anon, authenticated;
grant all on table public.ai_translation_automation to service_role;
grant all on table public.ai_translation_automation_runs to service_role;

insert into public.ai_translation_automation (id, enabled, provider, daily_target, per_run_limit, retry_failed, status)
values ('default', false, 'deepseek', 1000, 2, true, 'disabled')
on conflict (id) do nothing;

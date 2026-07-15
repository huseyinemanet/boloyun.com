alter table public.ai_translation_jobs
  drop constraint if exists ai_translation_jobs_batch_size_check;

alter table public.ai_translation_jobs
  add constraint ai_translation_jobs_batch_size_check
  check (batch_size between 1 and 1000);

alter table public.ai_translation_automation
  drop constraint if exists ai_translation_automation_daily_target_check;

alter table public.ai_translation_automation
  add constraint ai_translation_automation_daily_target_check
  check (daily_target between 1 and 1000000);

alter table public.ai_translation_automation
  drop constraint if exists ai_translation_automation_per_run_limit_check;

alter table public.ai_translation_automation
  add constraint ai_translation_automation_per_run_limit_check
  check (per_run_limit between 1 and 50);

alter table public.ai_translation_automation
  alter column daily_target set default 1000000,
  alter column per_run_limit set default 20;

update public.ai_translation_automation
set daily_target = 1000000,
    per_run_limit = 20,
    retry_failed = true,
    updated_at = now()
where id = 'default';

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
      (p_failed_only and s.status = 'failed' and coalesce(s.attempts, 0) < 3)
      or (
        not p_failed_only
        and (
          s.game_id is null
          or s.status = 'pending'
          or (s.status = 'failed' and coalesce(s.attempts, 0) < 3)
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
  limit greatest(0, least(p_limit, 1000));
$$;

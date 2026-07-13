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
  limit greatest(0, least(p_limit, 100));
$$;

delete from public.ai_provider_configs
where provider <> 'deepseek';

update public.ai_provider_configs
set enabled = true,
    updated_at = now()
where provider = 'deepseek'
  and encrypted_api_key is not null;

update public.ai_translation_automation
set enabled = true,
    provider = 'deepseek',
    daily_target = 1000,
    per_run_limit = 2,
    retry_failed = true,
    status = 'idle',
    last_error = null,
    updated_at = now()
where id = 'default';

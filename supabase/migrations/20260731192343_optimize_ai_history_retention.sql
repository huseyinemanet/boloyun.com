alter table public.ai_translation_job_items
  add column if not exists snapshots_purged_at timestamptz;

comment on column public.ai_translation_job_items.snapshots_purged_at is
  'When the heavy before/output JSON snapshots were removed after the retention period. Job and game metadata remain intact.';

create or replace function public.purge_expired_ai_translation_history(
  p_retention_days integer default 90,
  p_batch_size integer default 500
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_retention_days integer := greatest(90, least(coalesce(p_retention_days, 90), 3650));
  v_batch_size integer := greatest(1, least(coalesce(p_batch_size, 500), 500));
  v_cutoff timestamptz;
  v_items_purged integer := 0;
  v_runs_deleted integer := 0;
begin
  v_cutoff := now() - make_interval(days => v_retention_days);

  with candidates as materialized (
    select item.id
    from public.ai_translation_job_items item
    where item.status = 'completed'
      and item.completed_at < v_cutoff
      and item.snapshots_purged_at is null
    order by item.completed_at asc, item.id asc
    limit v_batch_size
    for update skip locked
  ), purged as (
    update public.ai_translation_job_items item
    set
      before_snapshot = '{}'::jsonb,
      output_snapshot = '{}'::jsonb,
      snapshots_purged_at = now()
    from candidates
    where item.id = candidates.id
    returning 1
  )
  select count(*)::integer into v_items_purged from purged;

  with candidates as materialized (
    select run.id
    from public.ai_translation_automation_runs run
    where run.completed_at < v_cutoff
    order by run.completed_at asc, run.id asc
    limit v_batch_size
    for update skip locked
  ), removed as (
    delete from public.ai_translation_automation_runs run
    using candidates
    where run.id = candidates.id
    returning 1
  )
  select count(*)::integer into v_runs_deleted from removed;

  return jsonb_build_object(
    'items_purged', v_items_purged,
    'runs_deleted', v_runs_deleted,
    'retention_days', v_retention_days,
    'batch_size', v_batch_size
  );
end;
$function$;

revoke all on function public.purge_expired_ai_translation_history(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_expired_ai_translation_history(integer, integer) to service_role;

comment on function public.purge_expired_ai_translation_history(integer, integer) is
  'Service-role-only bounded maintenance. Clears completed AI snapshot payloads and old automation runs without deleting games or job metadata.';

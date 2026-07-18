create or replace function public.get_admin_overview_snapshot_v2(
  p_since_24_hours timestamptz,
  p_since_7_days timestamptz,
  p_popular_limit integer default 10
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select public.get_admin_overview_snapshot(
    p_since_24_hours,
    p_since_7_days,
    p_popular_limit
  ) || jsonb_build_object(
    'runtime', jsonb_build_object(
      'databaseVersion', current_setting('server_version')
    )
  );
$function$;

revoke all on function public.get_admin_overview_snapshot_v2(timestamptz, timestamptz, integer) from public;
revoke all on function public.get_admin_overview_snapshot_v2(timestamptz, timestamptz, integer) from anon;
revoke all on function public.get_admin_overview_snapshot_v2(timestamptz, timestamptz, integer) from authenticated;
grant execute on function public.get_admin_overview_snapshot_v2(timestamptz, timestamptz, integer) to service_role;

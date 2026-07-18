create or replace function public.get_random_published_game_slug(
  p_exclude_slug text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_exclude_slug text := nullif(btrim(p_exclude_slug), '');
  v_pivot uuid := gen_random_uuid();
  v_slug text;
begin
  if v_exclude_slug is null then
    select g.slug
    into v_slug
    from public.games g
    where g.status = 'published'
      and g.id >= v_pivot
    order by g.id
    limit 1;

    if v_slug is null then
      select g.slug
      into v_slug
      from public.games g
      where g.status = 'published'
      and g.id < v_pivot
      order by g.id
      limit 1;
    end if;
  else
    select g.slug
    into v_slug
    from public.games g
    where g.status = 'published'
      and g.id >= v_pivot
      and g.slug <> v_exclude_slug
    order by g.id
    limit 1;

    if v_slug is null then
      select g.slug
      into v_slug
      from public.games g
      where g.status = 'published'
        and g.id < v_pivot
        and g.slug <> v_exclude_slug
      order by g.id
      limit 1;
    end if;
  end if;

  return v_slug;
end;
$function$;

revoke all on function public.get_random_published_game_slug(text) from public;
revoke all on function public.get_random_published_game_slug(text) from anon;
revoke all on function public.get_random_published_game_slug(text) from authenticated;
grant execute on function public.get_random_published_game_slug(text) to service_role;

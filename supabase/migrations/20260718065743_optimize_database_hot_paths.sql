create index if not exists games_published_id_idx
  on public.games (id)
  where status = 'published';

create index if not exists games_published_updated_id_nulls_last_idx
  on public.games (updated_at desc nulls last, id desc)
  where status = 'published';

create index if not exists ai_translation_job_items_completed_at_idx
  on public.ai_translation_job_items (completed_at desc)
  where status = 'completed';

create index if not exists ai_translation_job_items_job_updated_idx
  on public.ai_translation_job_items (job_id, updated_at desc);

alter table public.games set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

alter table public.ai_translation_job_items set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

alter table public.game_translation_state set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

create or replace function public.get_ai_translation_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'total_published', (
      select count(*)::integer
      from public.games
      where status = 'published'
    ),
    'completed', (
      select count(*)::integer
      from public.game_translation_state
      where status = 'completed'
    ),
    'failed', (
      select count(*)::integer
      from public.game_translation_state
      where status = 'failed'
    ),
    'skipped', (
      select count(*)::integer
      from public.game_translation_state
      where status = 'skipped'
    ),
    'processing', (
      select count(*)::integer
      from public.game_translation_state
      where status = 'processing'
    )
  );
$function$;

revoke execute on function public.get_ai_translation_stats() from public, anon, authenticated;
grant execute on function public.get_ai_translation_stats() to service_role;

create or replace function public.get_ai_translation_job_counts(p_job_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'completed', count(*) filter (where status = 'completed'),
    'failed', count(*) filter (where status = 'failed'),
    'skipped', count(*) filter (where status = 'skipped'),
    'pending', count(*) filter (where status = 'pending'),
    'processing', count(*) filter (where status = 'processing')
  )
  from public.ai_translation_job_items
  where job_id = p_job_id;
$function$;

revoke execute on function public.get_ai_translation_job_counts(uuid) from public, anon, authenticated;
grant execute on function public.get_ai_translation_job_counts(uuid) to service_role;

create or replace function public.get_public_category_game_page(
  p_slug text,
  p_limit integer,
  p_offset integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_safe_limit integer := greatest(1, least(coalesce(p_limit, 60), 120));
  v_safe_offset integer := greatest(0, coalesce(p_offset, 0));
  v_category_id uuid;
  v_category jsonb;
  v_total integer := 0;
  v_games jsonb := '[]'::jsonb;
begin
  select category_row.id, to_jsonb(category_row)
  into v_category_id, v_category
  from (
    select
      c.id,
      c.name,
      c.slug,
      c.description,
      c.icon_svg,
      c.icon_url,
      c.status,
      c.seo_title,
      c.seo_description,
      c.og_image_url,
      c.is_indexable
    from public.categories c
    where c.slug = p_slug
      and c.status = 'active'
    limit 1
  ) category_row;

  if v_category_id is null then
    return jsonb_build_object('category', null, 'games', '[]'::jsonb, 'total', 0);
  end if;

  with published_ids as materialized (
    select g.id
    from public.games g
    where g.status = 'published'
  )
  select count(*)::integer
  into v_total
  from public.game_categories gc
  join published_ids g on g.id = gc.game_id
  where gc.category_id = v_category_id;

  if v_total >= 2000 then
    select coalesce(
      jsonb_agg(to_jsonb(game_row) - 'updated_at' order by game_row.updated_at desc nulls last, game_row.id desc),
      '[]'::jsonb
    )
    into v_games
    from (
      select ordered_game.*
      from (
        select
          g.id,
          g.title,
          g.slug,
          g.thumbnail_url,
          g.game_type,
          g.status,
          g.rating_avg,
          g.rating_count,
          g.likes_count,
          g.dislikes_count,
          g.play_count,
          g.updated_at
        from public.games g
        where g.status = 'published'
        order by g.updated_at desc nulls last, g.id desc
        offset 0
      ) ordered_game
      where exists (
        select 1
        from public.game_categories gc
        where gc.category_id = v_category_id
          and gc.game_id = ordered_game.id
      )
      limit v_safe_limit
      offset v_safe_offset
    ) game_row;
  else
    select coalesce(
      jsonb_agg(to_jsonb(game_row) - 'updated_at' order by game_row.updated_at desc nulls last, game_row.id desc),
      '[]'::jsonb
    )
    into v_games
    from (
      select
        g.id,
        g.title,
        g.slug,
        g.thumbnail_url,
        g.game_type,
        g.status,
        g.rating_avg,
        g.rating_count,
        g.likes_count,
        g.dislikes_count,
        g.play_count,
        g.updated_at
      from public.game_categories gc
      join public.games g on g.id = gc.game_id
      where gc.category_id = v_category_id
        and g.status = 'published'
      order by g.updated_at desc nulls last, g.id desc
      limit v_safe_limit
      offset v_safe_offset
    ) game_row;
  end if;

  return jsonb_build_object(
    'category', v_category,
    'games', v_games,
    'total', v_total
  );
end;
$function$;

create or replace function public.get_public_tag_page(
  p_slug text,
  p_limit integer,
  p_offset integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_safe_limit integer := greatest(1, least(coalesce(p_limit, 60), 120));
  v_safe_offset integer := greatest(0, coalesce(p_offset, 0));
  v_tag_id uuid;
  v_tag jsonb;
  v_total integer := 0;
  v_games jsonb := '[]'::jsonb;
begin
  select tag_row.id, to_jsonb(tag_row)
  into v_tag_id, v_tag
  from (
    select
      t.id,
      t.name,
      t.slug,
      t.description,
      t.status,
      t.seo_title,
      t.seo_description,
      t.og_image_url,
      t.is_indexable,
      t.updated_at
    from public.tags t
    where t.slug = p_slug
      and t.status = 'active'
    limit 1
  ) tag_row;

  if v_tag_id is null then
    return jsonb_build_object('tag', null, 'games', '[]'::jsonb, 'total', 0);
  end if;

  with published_ids as materialized (
    select g.id
    from public.games g
    where g.status = 'published'
  )
  select count(*)::integer
  into v_total
  from public.game_tags gt
  join published_ids g on g.id = gt.game_id
  where gt.tag_id = v_tag_id;

  if v_total >= 2000 then
    select coalesce(
      jsonb_agg(to_jsonb(game_row) - 'updated_at' order by game_row.updated_at desc nulls last, game_row.id desc),
      '[]'::jsonb
    )
    into v_games
    from (
      select ordered_game.*
      from (
        select
          g.id,
          g.title,
          g.slug,
          g.thumbnail_url,
          g.game_type,
          g.status,
          g.rating_avg,
          g.rating_count,
          g.likes_count,
          g.dislikes_count,
          g.play_count,
          g.updated_at
        from public.games g
        where g.status = 'published'
        order by g.updated_at desc nulls last, g.id desc
        offset 0
      ) ordered_game
      where exists (
        select 1
        from public.game_tags gt
        where gt.tag_id = v_tag_id
          and gt.game_id = ordered_game.id
      )
      limit v_safe_limit
      offset v_safe_offset
    ) game_row;
  else
    select coalesce(
      jsonb_agg(to_jsonb(game_row) - 'updated_at' order by game_row.updated_at desc nulls last, game_row.id desc),
      '[]'::jsonb
    )
    into v_games
    from (
      select
        g.id,
        g.title,
        g.slug,
        g.thumbnail_url,
        g.game_type,
        g.status,
        g.rating_avg,
        g.rating_count,
        g.likes_count,
        g.dislikes_count,
        g.play_count,
        g.updated_at
      from public.game_tags gt
      join public.games g on g.id = gt.game_id
      where gt.tag_id = v_tag_id
        and g.status = 'published'
      order by g.updated_at desc nulls last, g.id desc
      limit v_safe_limit
      offset v_safe_offset
    ) game_row;
  end if;

  return jsonb_build_object(
    'tag', v_tag || jsonb_build_object('published_game_count', v_total),
    'games', v_games,
    'total', v_total
  );
end;
$function$;

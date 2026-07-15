create extension if not exists pg_trgm with schema extensions;

alter table public.categories
  add column if not exists show_in_sidebar boolean not null default false,
  add column if not exists sidebar_sort_order integer not null default 0;

with ranked_categories as (
  select
    id,
    row_number() over (order by sort_order asc nulls last, name asc, id asc) as position
  from public.categories
  where status = 'active'
)
update public.categories c
set
  show_in_sidebar = ranked_categories.position <= 24,
  sidebar_sort_order = ranked_categories.position
from ranked_categories
where c.id = ranked_categories.id
  and not exists (
    select 1
    from public.categories existing
    where existing.show_in_sidebar = true
  );

create index if not exists categories_public_sidebar_idx
  on public.categories (show_in_sidebar, status, sidebar_sort_order, name);

alter table public.games
  add column if not exists search_document tsvector
  generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(title, '') || ' ' ||
      coalesce(short_description, '') || ' ' ||
      coalesce(long_description, '')
    )
  ) stored;

create index if not exists games_published_title_trgm_idx
  on public.games using gin (title extensions.gin_trgm_ops)
  where status = 'published';

create index if not exists games_published_search_document_idx
  on public.games using gin (search_document)
  where status = 'published';

alter table public.game_plays
  add column if not exists event_id uuid;

create unique index if not exists game_plays_event_id_unique_idx
  on public.game_plays (event_id)
  where event_id is not null;

create or replace function public.get_public_shell_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'section', s.section,
            'value', s.value,
            'updated_at', s.updated_at,
            'updated_by_label', s.updated_by_label
          )
          order by s.section
        )
        from public.site_settings s
      ),
      '[]'::jsonb
    ),
    'categories', coalesce(
      (
        select jsonb_agg(to_jsonb(category_row) order by category_row.sidebar_sort_order, category_row.name, category_row.id)
        from (
          select
            c.id,
            c.name,
            c.slug,
            c.icon_svg,
            c.icon_url,
            c.sidebar_sort_order
          from public.categories c
          where c.status = 'active'
            and c.show_in_sidebar = true
          order by c.sidebar_sort_order asc, c.name asc, c.id asc
          limit 24
        ) category_row
      ),
      '[]'::jsonb
    ),
    'ads', coalesce(
      (
        select jsonb_agg(to_jsonb(ad_row) order by ad_row.slot_key)
        from (
          select
            slot.key as slot_key,
            selected_ad.id,
            selected_ad.name,
            selected_ad.ad_code,
            selected_ad.show_desktop,
            selected_ad.show_mobile
          from public.ad_slots slot
          cross join lateral (
            select a.*
            from public.ads a
            where a.slot_id = slot.id
              and a.is_active = true
              and (a.start_at is null or a.start_at <= statement_timestamp())
              and (a.end_at is null or a.end_at >= statement_timestamp())
            order by a.priority desc, a.updated_at desc, a.id desc
            limit 1
          ) selected_ad
          where slot.is_active = true
        ) ad_row
      ),
      '[]'::jsonb
    )
  );
$$;

revoke execute on function public.get_public_shell_snapshot() from public, anon, authenticated;
grant execute on function public.get_public_shell_snapshot() to service_role;

create or replace function public.get_public_homepage(
  p_section_limit integer default 12,
  p_all_limit integer default 60
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with args as (
    select
      greatest(1, least(coalesce(p_section_limit, 12), 12)) as section_limit,
      greatest(20, least(coalesce(p_all_limit, 60), 80)) as all_limit
  ),
  active_sections as (
    select
      s.id,
      s.title,
      s.section_type,
      s.source_type,
      s.source_id,
      s.manual_game_ids,
      least(coalesce(s.limit_count, 12), (select section_limit from args)) as limit_count,
      s.sort_order,
      s.visibility
    from public.homepage_sections s
    where s.status = 'active'
      and coalesce(s.visibility, 'all') <> 'members'
    order by s.sort_order asc, s.id asc
  ),
  sections_with_games as (
    select
      s.*,
      coalesce(
        (
          select jsonb_agg(to_jsonb(game_row) - 'result_order' order by game_row.result_order)
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
              row_number() over (
                order by
                  case when s.section_type = 'manual_games' then coalesce((
                    select manual_item.ordinality::bigint
                    from jsonb_array_elements_text(coalesce(s.manual_game_ids, '[]'::jsonb)) with ordinality manual_item(value, ordinality)
                    where manual_item.value = g.id::text
                    limit 1
                  ), 2147483647) end asc,
                  case when s.section_type = 'popular_games' then coalesce(g.play_count, 0) end desc,
                  case when s.section_type = 'trending_games' then coalesce(g.likes_count, 0) + coalesce(g.play_count, 0) / 20.0 end desc,
                  case when s.section_type = 'random_picks' then md5(g.id::text || current_date::text) end asc,
                  g.created_at desc,
                  g.id desc
              ) as result_order
            from public.games g
            where g.status = 'published'
              and (
                s.section_type not in ('manual_games', 'category_based', 'tag_based')
                or (
                  s.section_type = 'manual_games'
                  and coalesce(s.manual_game_ids, '[]'::jsonb) ? g.id::text
                )
                or (
                  s.section_type = 'category_based'
                  and exists (
                    select 1 from public.game_categories gc
                    where gc.game_id = g.id and gc.category_id = s.source_id
                  )
                )
                or (
                  s.section_type = 'tag_based'
                  and exists (
                    select 1 from public.game_tags gt
                    where gt.game_id = g.id and gt.tag_id = s.source_id
                  )
                )
              )
            order by result_order
            limit s.limit_count
          ) game_row
        ),
        '[]'::jsonb
      ) as games
    from active_sections s
  ),
  latest_games as (
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
      g.created_at
    from public.games g
    where g.status = 'published'
    order by g.created_at desc, g.id desc
    limit (select all_limit from args)
  )
  select jsonb_build_object(
    'sections', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', section_row.id,
            'title', section_row.title,
            'section_type', section_row.section_type,
            'source_type', section_row.source_type,
            'source_id', section_row.source_id,
            'limit_count', section_row.limit_count,
            'sort_order', section_row.sort_order,
            'visibility', section_row.visibility,
            'games', section_row.games
          )
          order by section_row.sort_order, section_row.id
        )
        from sections_with_games section_row
      ),
      '[]'::jsonb
    ),
    'latest_games', coalesce(
      (
        select jsonb_agg(to_jsonb(game_row) - 'created_at' order by game_row.created_at desc, game_row.id desc)
        from latest_games game_row
      ),
      '[]'::jsonb
    )
  );
$$;

revoke execute on function public.get_public_homepage(integer, integer) from public, anon, authenticated;
grant execute on function public.get_public_homepage(integer, integer) to service_role;

create or replace function public.get_public_game_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with selected_game as (
    select
      g.id, g.title, g.slug, g.short_description, g.long_description,
      g.how_to_play, g.controls, g.features, g.developer, g.thumbnail_url,
      g.game_type, g.embed_url, g.swf_url, g.html5_url, g.external_url,
      g.source_url, g.source_domain, g.status, g.rating_avg, g.rating_count,
      g.likes_count, g.dislikes_count, g.play_count, g.seo_title,
      g.seo_description, g.primary_category_id, g.og_image_url,
      g.is_indexable, g.is_broken
    from public.games g
    where g.slug = p_slug and g.status = 'published'
    limit 1
  ),
  selected_categories as (
    select c.id, c.name, c.slug
    from public.game_categories gc
    join selected_game game on game.id = gc.game_id
    join public.categories c on c.id = gc.category_id
    where c.status = 'active'
    order by (c.id = (select primary_category_id from selected_game)) desc, c.name asc, c.id asc
  ),
  selected_tags as (
    select t.id, t.name, t.slug
    from public.game_tags gt
    join selected_game game on game.id = gt.game_id
    join public.tags t on t.id = gt.tag_id
    where t.status = 'active'
    order by t.name asc, t.id asc
  ),
  selected_category as (
    select coalesce(
      (select primary_category_id from selected_game),
      (select id from selected_categories limit 1)
    ) as id
  ),
  related_scores as (
    select candidate_id, sum(score)::integer as score
    from (
      select candidate.game_id as candidate_id, 2 as score
      from public.game_categories source
      join selected_game game on game.id = source.game_id
      join public.game_categories candidate on candidate.category_id = source.category_id and candidate.game_id <> game.id
      union all
      select candidate.game_id as candidate_id, 1 as score
      from public.game_tags source
      join selected_game game on game.id = source.game_id
      join public.game_tags candidate on candidate.tag_id = source.tag_id and candidate.game_id <> game.id
    ) scored
    group by candidate_id
  ),
  related_games as (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      score.score
    from related_scores score
    join public.games g on g.id = score.candidate_id
    where g.status = 'published'
    order by score.score desc, g.play_count desc, g.created_at desc, g.id desc
    limit 4
  ),
  latest_category_games as (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.created_at
    from public.game_categories gc
    join selected_category category on category.id = gc.category_id
    join public.games g on g.id = gc.game_id
    where g.status = 'published' and g.id <> (select id from selected_game)
    order by g.created_at desc, g.id desc
    limit 4
  ),
  popular_category_games as (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count
    from public.game_categories gc
    join selected_category category on category.id = gc.category_id
    join public.games g on g.id = gc.game_id
    where g.status = 'published' and g.id <> (select id from selected_game)
    order by g.play_count desc, g.created_at desc, g.id desc
    limit 4
  )
  select jsonb_build_object(
    'game', (select to_jsonb(game) from selected_game game),
    'categories', coalesce((select jsonb_agg(to_jsonb(category)) from selected_categories category), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(to_jsonb(tag)) from selected_tags tag), '[]'::jsonb),
    'related_games', coalesce((select jsonb_agg(to_jsonb(game) - 'score' order by game.score desc, game.play_count desc) from related_games game), '[]'::jsonb),
    'latest_category_games', coalesce((select jsonb_agg(to_jsonb(game) - 'created_at' order by game.created_at desc, game.id desc) from latest_category_games game), '[]'::jsonb),
    'popular_category_games', coalesce((select jsonb_agg(to_jsonb(game) order by game.play_count desc, game.id desc) from popular_category_games game), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_public_game_page(text) from public, anon, authenticated;
grant execute on function public.get_public_game_page(text) to service_role;

create or replace function public.search_published_games(
  p_query text,
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with args as (
    select
      trim(left(coalesce(p_query, ''), 80)) as query,
      greatest(1, least(coalesce(p_limit, 24), 60)) as safe_limit,
      greatest(0, coalesce(p_offset, 0)) as safe_offset
  ),
  matched as (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.short_description,
      case
        when lower(g.title) = lower(args.query) then 0
        when lower(g.title) like lower(args.query) || '%' then 1
        when lower(g.title) like '%' || lower(args.query) || '%' then 2
        when g.title operator(extensions.%) args.query then 3
        else 4
      end as rank_group,
      extensions.similarity(g.title, args.query) as title_similarity
    from public.games g
    cross join args
    where args.query <> ''
      and g.status = 'published'
      and (
        g.title ilike '%' || args.query || '%'
        or g.title operator(extensions.%) args.query
        or g.search_document @@ plainto_tsquery('simple'::regconfig, args.query)
      )
  ),
  result_page as (
    select matched.*
    from matched
    cross join args
    order by matched.rank_group asc, matched.title_similarity desc, matched.play_count desc, matched.title asc, matched.id asc
    limit (select safe_limit from args)
    offset (select safe_offset from args)
  )
  select jsonb_build_object(
    'items', coalesce(
      (
        select jsonb_agg(
          to_jsonb(result) - 'rank_group' - 'title_similarity'
          order by result.rank_group asc, result.title_similarity desc, result.play_count desc, result.title asc, result.id asc
        )
        from result_page result
      ),
      '[]'::jsonb
    ),
    'total', (select count(*) from matched)
  );
$$;

revoke execute on function public.search_published_games(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_published_games(text, integer, integer) to service_role;

create or replace function public.record_game_play_event_atomic(
  p_game_id uuid,
  p_session_id text,
  p_event_id uuid,
  p_profile_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(trim(p_session_id)) < 16 then raise exception 'invalid session'; end if;
  if not exists (select 1 from public.games where id = p_game_id and status = 'published') then return false; end if;
  if exists (select 1 from public.game_plays where event_id = p_event_id) then return false; end if;
  if exists (
    select 1 from public.game_plays
    where game_id = p_game_id and session_id = p_session_id
      and last_played_at >= clock_timestamp() - interval '30 minutes'
  ) then return false; end if;

  insert into public.game_plays(game_id, user_id, session_id, event_id, last_played_at)
  values (p_game_id, p_profile_id, p_session_id, p_event_id, clock_timestamp());

  update public.games
  set play_count = coalesce(play_count, 0) + 1,
      updated_at = clock_timestamp()
  where id = p_game_id;

  return true;
end;
$$;

revoke execute on function public.record_game_play_event_atomic(uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_game_play_event_atomic(uuid, text, uuid, uuid) to service_role;

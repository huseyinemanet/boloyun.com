alter table public.games
  add column if not exists favorite_count integer not null default 0,
  add column if not exists popularity_score numeric not null default 0;

create or replace function public.calculate_game_popularity_score(
  p_play_count integer,
  p_favorite_count integer,
  p_likes_count integer,
  p_dislikes_count integer,
  p_rating_avg numeric,
  p_rating_count integer
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round((
    ln(1 + greatest(coalesce(p_play_count, 0), 0)) * 20
    + ln(1 + greatest(coalesce(p_favorite_count, 0), 0)) * 45
    + ln(1 + greatest(coalesce(p_rating_count, 0), 0)) * 30
    + ln(1 + greatest(coalesce(p_likes_count, 0), 0)) * 4
    + (coalesce(p_rating_avg, 0) - 3) * 12
      * (greatest(coalesce(p_rating_count, 0), 0)::numeric / (greatest(coalesce(p_rating_count, 0), 0) + 5))
    - ln(1 + greatest(coalesce(p_dislikes_count, 0), 0)) * 8
  )::numeric, 4);
$$;

revoke execute on function public.calculate_game_popularity_score(integer, integer, integer, integer, numeric, integer)
  from public, anon, authenticated;
grant execute on function public.calculate_game_popularity_score(integer, integer, integer, integer, numeric, integer)
  to service_role;

create or replace function public.refresh_game_engagement_totals(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_favorites integer;
  v_positive integer;
  v_negative integer;
  v_total integer;
  v_average numeric;
begin
  select
    (select count(*) from public.favorites where game_id = p_game_id)
      + (select count(*) from public.session_favorites where game_id = p_game_id),
    count(*) filter (where vote in ('like', 'love', 'haha', 'wow')),
    count(*) filter (where vote in ('sad', 'angry')),
    count(*),
    coalesce(round(avg(case vote
      when 'love' then 5.0 when 'like' then 4.5 when 'haha' then 4.0
      when 'wow' then 4.0 when 'sad' then 2.0 when 'angry' then 1.0
    end), 2), 0)
  into v_favorites, v_positive, v_negative, v_total, v_average
  from public.game_reactions
  where game_id = p_game_id;

  update public.games
  set favorite_count = v_favorites,
      likes_count = v_positive,
      dislikes_count = v_negative,
      rating_count = v_total,
      rating_avg = v_average,
      popularity_score = public.calculate_game_popularity_score(
        coalesce(play_count, 0), v_favorites, v_positive, v_negative, v_average, v_total
      )
  where id = p_game_id;
end;
$$;

revoke execute on function public.refresh_game_engagement_totals(uuid) from public, anon, authenticated;
grant execute on function public.refresh_game_engagement_totals(uuid) to service_role;

do $$
declare v_game_id uuid;
begin
  for v_game_id in select id from public.games loop
    perform public.refresh_game_engagement_totals(v_game_id);
  end loop;
end;
$$;

create index if not exists games_published_popularity_idx
  on public.games (popularity_score desc, play_count desc, created_at desc, id desc)
  where status = 'published';

create or replace function public.set_game_reaction_atomic(
  p_game_id uuid, p_session_id text, p_reaction text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_existing text; v_selected text; v_game public.games%rowtype;
begin
  if p_reaction not in ('like', 'love', 'haha', 'wow', 'sad', 'angry')
    or length(trim(p_session_id)) < 16 then raise exception 'invalid reaction'; end if;
  if not exists (select 1 from public.games where id = p_game_id and status = 'published') then
    raise exception 'game not found';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_game_id::text, 0));
  select vote into v_existing from public.game_reactions
  where game_id = p_game_id and session_id = p_session_id;
  if v_existing = p_reaction then
    delete from public.game_reactions where game_id = p_game_id and session_id = p_session_id;
    v_selected := null;
  else
    insert into public.game_reactions(game_id, session_id, vote, updated_at)
    values (p_game_id, p_session_id, p_reaction, clock_timestamp())
    on conflict (game_id, session_id) do update
      set vote = excluded.vote, updated_at = excluded.updated_at;
    v_selected := p_reaction;
  end if;
  perform public.refresh_game_engagement_totals(p_game_id);
  select * into v_game from public.games where id = p_game_id;
  return jsonb_build_object(
    'selectedReaction', v_selected, 'likesCount', v_game.likes_count,
    'dislikesCount', v_game.dislikes_count, 'ratingCount', v_game.rating_count,
    'ratingAvg', v_game.rating_avg, 'favoriteCount', v_game.favorite_count,
    'popularityScore', v_game.popularity_score
  );
end;
$$;

revoke execute on function public.set_game_reaction_atomic(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_game_reaction_atomic(uuid, text, text) to service_role;

create or replace function public.set_favorite_atomic(
  p_game_id uuid, p_profile_id uuid, p_session_id text, p_desired boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.games where id = p_game_id and status = 'published') then raise exception 'game unavailable'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_game_id::text, 0));
  if p_profile_id is not null then
    if not exists (select 1 from public.profiles where id = p_profile_id and status = 'active') then raise exception 'profile unavailable'; end if;
    if p_desired then insert into public.favorites(user_id, game_id) values (p_profile_id, p_game_id) on conflict do nothing;
    else delete from public.favorites where user_id = p_profile_id and game_id = p_game_id; end if;
  elsif length(coalesce(p_session_id, '')) >= 16 then
    if p_desired then insert into public.session_favorites(game_id, session_id) values (p_game_id, p_session_id) on conflict do nothing;
    else delete from public.session_favorites where game_id = p_game_id and session_id = p_session_id; end if;
  else raise exception 'favorite owner unavailable'; end if;
  perform public.refresh_game_engagement_totals(p_game_id);
  return p_desired;
end;
$$;

revoke execute on function public.set_favorite_atomic(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_favorite_atomic(uuid, uuid, text, boolean) to service_role;

create or replace function public.migrate_session_favorites_atomic(p_session_id text, p_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer := 0; v_inserted integer; v_game_id uuid;
begin
  if length(coalesce(p_session_id, '')) < 16 then raise exception 'invalid session'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id and status = 'active') then raise exception 'profile unavailable'; end if;
  for v_game_id in select game_id from public.session_favorites where session_id = p_session_id loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_game_id::text, 0));
    insert into public.favorites(user_id, game_id) values (p_profile_id, v_game_id) on conflict do nothing;
    get diagnostics v_inserted = row_count;
    v_count := v_count + v_inserted;
  end loop;
  for v_game_id in delete from public.session_favorites where session_id = p_session_id returning game_id loop
    perform public.refresh_game_engagement_totals(v_game_id);
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.migrate_session_favorites_atomic(text, uuid) from public, anon, authenticated;
grant execute on function public.migrate_session_favorites_atomic(text, uuid) to service_role;

create or replace function public.record_game_play_event_atomic(
  p_game_id uuid, p_session_id text, p_event_id uuid, p_profile_id uuid default null
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
  if exists (select 1 from public.game_plays where game_id = p_game_id and session_id = p_session_id and last_played_at >= clock_timestamp() - interval '30 minutes') then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_game_id::text, 0));
  insert into public.game_plays(game_id, user_id, session_id, event_id, last_played_at)
  values (p_game_id, p_profile_id, p_session_id, p_event_id, clock_timestamp());
  update public.games set
    play_count = coalesce(play_count, 0) + 1,
    popularity_score = public.calculate_game_popularity_score(
      coalesce(play_count, 0) + 1, favorite_count, likes_count, dislikes_count, rating_avg, rating_count
    )
  where id = p_game_id;
  return true;
end;
$$;

revoke execute on function public.record_game_play_event_atomic(uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_game_play_event_atomic(uuid, text, uuid, uuid) to service_role;

create or replace function public.search_published_games(p_query text, p_limit integer default 24, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  with args as (
    select trim(left(coalesce(p_query, ''), 80)) query,
      greatest(1, least(coalesce(p_limit, 24), 60)) safe_limit,
      greatest(0, coalesce(p_offset, 0)) safe_offset
  ), matched as (
    select g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.favorite_count, g.popularity_score, g.short_description,
      case when lower(g.title) = lower(args.query) then 0
        when lower(g.title) like lower(args.query) || '%' then 1
        when lower(g.title) like '%' || lower(args.query) || '%' then 2
        when g.title operator(extensions.%) args.query then 3 else 4 end rank_group,
      extensions.similarity(g.title, args.query) title_similarity
    from public.games g cross join args
    where args.query <> '' and g.status = 'published' and (
      g.title ilike '%' || args.query || '%' or g.title operator(extensions.%) args.query
      or g.search_document @@ plainto_tsquery('simple'::regconfig, args.query)
    )
  ), result_page as (
    select matched.* from matched cross join args
    order by rank_group, title_similarity desc, popularity_score desc, play_count desc, title, id
    limit (select safe_limit from args) offset (select safe_offset from args)
  )
  select jsonb_build_object('items', coalesce((select jsonb_agg(
    to_jsonb(result) - 'rank_group' - 'title_similarity'
    order by rank_group, title_similarity desc, popularity_score desc, play_count desc, title, id
  ) from result_page result), '[]'::jsonb), 'total', (select count(*) from matched));
$$;

revoke execute on function public.search_published_games(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_published_games(text, integer, integer) to service_role;

create or replace function public.get_trending_published_games(p_limit integer default 12)
returns jsonb language sql stable security definer set search_path = '' as $$
  with recent as (
    select game_id, sum(weight)::numeric recent_score from (
      select game_id, count(*) * 3.0 weight from public.game_plays where last_played_at >= current_timestamp - interval '7 days' group by game_id
      union all select game_id, count(*) * 8.0 from public.game_reactions where updated_at >= current_timestamp - interval '7 days' group by game_id
      union all select game_id, count(*) * 12.0 from public.favorites where created_at >= current_timestamp - interval '7 days' group by game_id
      union all select game_id, count(*) * 12.0 from public.session_favorites where created_at >= current_timestamp - interval '7 days' group by game_id
    ) signals group by game_id
  ), ranked as (
    select g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.favorite_count, g.popularity_score, g.created_at, coalesce(recent.recent_score, 0) recent_score
    from public.games g left join recent on recent.game_id = g.id where g.status = 'published'
    order by recent_score desc, g.popularity_score desc, g.created_at desc, g.id desc
    limit greatest(1, least(coalesce(p_limit, 12), 60))
  ) select coalesce(jsonb_agg(to_jsonb(ranked) - array['recent_score', 'created_at']
    order by recent_score desc, popularity_score desc, created_at desc, id desc), '[]'::jsonb) from ranked;
$$;

revoke execute on function public.get_trending_published_games(integer) from public, anon, authenticated;
grant execute on function public.get_trending_published_games(integer) to service_role;

create or replace function public.get_public_game_page(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with selected_game as (
    select g.id, g.title, g.slug, g.short_description, g.long_description,
      g.how_to_play, g.controls, g.features, g.developer, g.thumbnail_url,
      g.game_type, g.embed_url, g.swf_url, g.html5_url, g.external_url,
      g.source_url, g.source_domain, g.status, g.rating_avg, g.rating_count,
      g.likes_count, g.dislikes_count, g.play_count, g.favorite_count,
      g.popularity_score, g.seo_title, g.seo_description, g.primary_category_id,
      g.og_image_url, g.is_indexable, g.is_broken
    from public.games g where g.slug = p_slug and g.status = 'published' limit 1
  ), selected_categories as (
    select c.id, c.name, c.slug from public.game_categories gc
    join selected_game game on game.id = gc.game_id
    join public.categories c on c.id = gc.category_id where c.status = 'active'
    order by (c.id = (select primary_category_id from selected_game)) desc, c.name, c.id
  ), selected_tags as (
    select t.id, t.name, t.slug from public.game_tags gt
    join selected_game game on game.id = gt.game_id
    join public.tags t on t.id = gt.tag_id where t.status = 'active'
    order by t.name, t.id
  ), selected_category as (
    select coalesce((select primary_category_id from selected_game), (select id from selected_categories limit 1)) id
  ), category_stats as materialized (
    select category.id, category.id = (select primary_category_id from selected_game) is_primary,
      count(links.game_id)::double precision linked_game_count
    from selected_categories category join public.game_categories links on links.category_id = category.id
    group by category.id
  ), tag_stats as materialized (
    select tag.id, count(links.game_id)::double precision linked_game_count
    from selected_tags tag join public.game_tags links on links.tag_id = tag.id group by tag.id
  ), signals as materialized (
    select gc.game_id, (case when stat.is_primary then 6.0 else 8.0 end)
      + 1000.0 / sqrt(greatest(stat.linked_game_count, 1.0)) score, 1 category_match, 0 tag_match
    from public.game_categories gc join category_stats stat on stat.id = gc.category_id
    where gc.game_id <> (select id from selected_game)
    union all
    select gt.game_id, 3.0 + 600.0 / sqrt(greatest(stat.linked_game_count, 1.0)), 0, 1
    from public.game_tags gt join tag_stats stat on stat.id = gt.tag_id
    where gt.game_id <> (select id from selected_game)
  ), scores as materialized (
    select game_id, sum(score) taxonomy_score, sum(category_match) shared_category_count,
      sum(tag_match) shared_tag_count from signals group by game_id
  ), related as (
    select g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.favorite_count, g.popularity_score, g.created_at, score.taxonomy_score,
      score.shared_category_count, score.shared_tag_count
    from scores score join public.games g on g.id = score.game_id where g.status = 'published'
    order by score.taxonomy_score desc, score.shared_category_count desc,
      score.shared_tag_count desc, g.popularity_score desc, g.id desc limit 25
  ), category_games as materialized (
    select g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.favorite_count, g.popularity_score, g.created_at
    from public.game_categories gc join selected_category category on category.id = gc.category_id
    join public.games g on g.id = gc.game_id
    where g.status = 'published' and g.id <> (select id from selected_game)
  ), latest_category as (
    select * from category_games order by created_at desc, id desc limit 25
  ), popular_category as (
    select * from category_games order by popularity_score desc, play_count desc, id desc limit 25
  )
  select jsonb_build_object(
    'game', (select to_jsonb(game) from selected_game game),
    'categories', coalesce((select jsonb_agg(to_jsonb(category)) from selected_categories category), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(to_jsonb(tag)) from selected_tags tag), '[]'::jsonb),
    'related_games', coalesce((select jsonb_agg(to_jsonb(game) - array['created_at','taxonomy_score','shared_category_count','shared_tag_count']
      order by taxonomy_score desc, shared_category_count desc, shared_tag_count desc, popularity_score desc, id desc) from related game), '[]'::jsonb),
    'latest_category_games', coalesce((select jsonb_agg(to_jsonb(game) - 'created_at' order by created_at desc, id desc) from latest_category game), '[]'::jsonb),
    'popular_category_games', coalesce((select jsonb_agg(to_jsonb(game) - 'created_at' order by popularity_score desc, play_count desc, id desc) from popular_category game), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_public_game_page(text) from public, anon, authenticated;
grant execute on function public.get_public_game_page(text) to service_role;

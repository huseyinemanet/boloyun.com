create index if not exists games_published_rating_rank_idx
  on public.games (rating_count desc, rating_avg desc, play_count desc, created_at desc, id desc)
  where status = 'published';

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
  related_games as (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.created_at
    from public.games g
    join public.game_categories gc on gc.game_id = g.id
    join selected_category category on category.id = gc.category_id
    where g.status = 'published'
      and g.id <> (select id from selected_game)
    order by g.rating_count desc, g.rating_avg desc, g.play_count desc, g.created_at desc, g.id desc
    limit 4
  ),
  latest_category_games as (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.created_at
    from public.games g
    join public.game_categories gc on gc.game_id = g.id
    join selected_category category on category.id = gc.category_id
    where g.status = 'published'
      and g.id <> (select id from selected_game)
    order by g.created_at desc, g.id desc
    limit 4
  ),
  popular_category_games as (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.created_at
    from public.games g
    join public.game_categories gc on gc.game_id = g.id
    join selected_category category on category.id = gc.category_id
    where g.status = 'published'
      and g.id <> (select id from selected_game)
    order by g.play_count desc, g.created_at desc, g.id desc
    limit 4
  )
  select jsonb_build_object(
    'game', (select to_jsonb(game) from selected_game game),
    'categories', coalesce((select jsonb_agg(to_jsonb(category)) from selected_categories category), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(to_jsonb(tag)) from selected_tags tag), '[]'::jsonb),
    'related_games', coalesce((select jsonb_agg(to_jsonb(game) - 'created_at' order by game.rating_count desc, game.rating_avg desc, game.play_count desc, game.id desc) from related_games game), '[]'::jsonb),
    'latest_category_games', coalesce((select jsonb_agg(to_jsonb(game) - 'created_at' order by game.created_at desc, game.id desc) from latest_category_games game), '[]'::jsonb),
    'popular_category_games', coalesce((select jsonb_agg(to_jsonb(game) - 'created_at' order by game.play_count desc, game.created_at desc, game.id desc) from popular_category_games game), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_public_game_page(text) from public, anon, authenticated;
grant execute on function public.get_public_game_page(text) to service_role;

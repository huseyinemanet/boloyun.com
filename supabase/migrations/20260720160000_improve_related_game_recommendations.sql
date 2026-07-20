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
  selected_category_stats as materialized (
    select
      category.id,
      category.id = (select primary_category_id from selected_game) as is_primary,
      count(all_links.game_id)::double precision as linked_game_count
    from selected_categories category
    join public.game_categories all_links on all_links.category_id = category.id
    group by category.id
  ),
  selected_tag_stats as materialized (
    select
      tag.id,
      count(all_links.game_id)::double precision as linked_game_count
    from selected_tags tag
    join public.game_tags all_links on all_links.tag_id = tag.id
    group by tag.id
  ),
  candidate_signals as materialized (
    select
      gc.game_id,
      (case when category.is_primary then 6.0 else 8.0 end)
        + 1000.0 / sqrt(greatest(category.linked_game_count, 1.0)) as score,
      1 as category_match,
      0 as tag_match
    from public.game_categories gc
    join selected_category_stats category on category.id = gc.category_id
    where gc.game_id <> (select id from selected_game)

    union all

    select
      gt.game_id,
      3.0 + 600.0 / sqrt(greatest(tag.linked_game_count, 1.0)) as score,
      0 as category_match,
      1 as tag_match
    from public.game_tags gt
    join selected_tag_stats tag on tag.id = gt.tag_id
    where gt.game_id <> (select id from selected_game)
  ),
  candidate_scores as materialized (
    select
      signal.game_id,
      sum(signal.score) as taxonomy_score,
      sum(signal.category_match) as shared_category_count,
      sum(signal.tag_match) as shared_tag_count
    from candidate_signals signal
    group by signal.game_id
  ),
  related_games as (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.created_at, score.taxonomy_score, score.shared_category_count,
      score.shared_tag_count
    from candidate_scores score
    join public.games g on g.id = score.game_id
    where g.status = 'published'
    order by
      score.taxonomy_score desc,
      score.shared_category_count desc,
      score.shared_tag_count desc,
      g.rating_count desc,
      g.rating_avg desc,
      g.play_count desc,
      g.id desc
    limit 5
  ),
  category_games as materialized (
    select
      g.id, g.title, g.slug, g.thumbnail_url, g.game_type, g.status,
      g.rating_avg, g.rating_count, g.likes_count, g.dislikes_count, g.play_count,
      g.created_at
    from public.game_categories gc
    join selected_category category on category.id = gc.category_id
    join public.games g on g.id = gc.game_id
    where g.status = 'published'
      and g.id <> (select id from selected_game)
  ),
  latest_category_games as (
    select *
    from category_games
    order by created_at desc, id desc
    limit 5
  ),
  popular_category_games as (
    select *
    from category_games
    order by play_count desc, created_at desc, id desc
    limit 5
  )
  select jsonb_build_object(
    'game', (select to_jsonb(game) from selected_game game),
    'categories', coalesce((select jsonb_agg(to_jsonb(category)) from selected_categories category), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(to_jsonb(tag)) from selected_tags tag), '[]'::jsonb),
    'related_games', coalesce((
      select jsonb_agg(
        to_jsonb(game) - 'created_at' - 'taxonomy_score' - 'shared_category_count' - 'shared_tag_count'
        order by game.taxonomy_score desc, game.shared_category_count desc,
          game.shared_tag_count desc, game.rating_count desc, game.rating_avg desc,
          game.play_count desc, game.id desc
      )
      from related_games game
    ), '[]'::jsonb),
    'latest_category_games', coalesce((select jsonb_agg(to_jsonb(game) - 'created_at' order by game.created_at desc, game.id desc) from latest_category_games game), '[]'::jsonb),
    'popular_category_games', coalesce((select jsonb_agg(to_jsonb(game) - 'created_at' order by game.play_count desc, game.created_at desc, game.id desc) from popular_category_games game), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_public_game_page(text) from public, anon, authenticated;
grant execute on function public.get_public_game_page(text) to service_role;

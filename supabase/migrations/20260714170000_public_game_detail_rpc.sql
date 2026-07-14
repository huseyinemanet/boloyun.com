create or replace function public.get_public_game_detail(
  p_slug text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with selected_game as (
    select
      g.id,
      g.title,
      g.slug,
      g.short_description,
      g.long_description,
      g.how_to_play,
      g.controls,
      g.features,
      g.developer,
      g.thumbnail_url,
      g.game_type,
      g.embed_url,
      g.swf_url,
      g.html5_url,
      g.external_url,
      g.source_url,
      g.source_domain,
      g.status,
      g.rating_avg,
      g.rating_count,
      g.likes_count,
      g.dislikes_count,
      g.play_count,
      g.seo_title,
      g.seo_description,
      g.primary_category_id,
      g.og_image_url,
      g.is_indexable,
      g.is_broken
    from public.games g
    where g.slug = p_slug
      and g.status = 'published'
    limit 1
  ),
  selected_categories as (
    select
      c.id,
      c.name,
      c.slug
    from public.game_categories gc
    join selected_game g on g.id = gc.game_id
    join public.categories c on c.id = gc.category_id
    where c.status = 'active'
    order by (c.id = (select primary_category_id from selected_game)) desc, c.name asc, c.id asc
  ),
  selected_tags as (
    select
      t.id,
      t.name,
      t.slug
    from public.game_tags gt
    join selected_game g on g.id = gt.game_id
    join public.tags t on t.id = gt.tag_id
    where t.status = 'active'
    order by t.name asc, t.id asc
  )
  select jsonb_build_object(
    'game',
    (
      select to_jsonb(g)
      from selected_game g
    ),
    'categories',
    coalesce(
      (
        select jsonb_agg(to_jsonb(c) order by (c.id = (select primary_category_id from selected_game)) desc, c.name asc, c.id asc)
        from selected_categories c
      ),
      '[]'::jsonb
    ),
    'tags',
    coalesce(
      (
        select jsonb_agg(to_jsonb(t) order by t.name asc, t.id asc)
        from selected_tags t
      ),
      '[]'::jsonb
    )
  );
$$;

revoke execute on function public.get_public_game_detail(text) from public, anon, authenticated;
grant execute on function public.get_public_game_detail(text) to service_role;

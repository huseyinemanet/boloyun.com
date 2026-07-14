create or replace function public.get_public_category_game_page(
  p_slug text,
  p_limit integer,
  p_offset integer
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with args as (
    select
      greatest(1, least(coalesce(p_limit, 60), 120)) as safe_limit,
      greatest(0, coalesce(p_offset, 0)) as safe_offset
  ),
  selected_category as (
    select
      id,
      name,
      slug,
      description,
      icon_svg,
      icon_url,
      status,
      seo_title,
      seo_description,
      og_image_url,
      is_indexable
    from public.categories
    where slug = p_slug
      and status = 'active'
    limit 1
  ),
  published_links as (
    select gc.game_id
    from public.game_categories gc
    join selected_category c on c.id = gc.category_id
    join public.games g on g.id = gc.game_id
    where g.status = 'published'
  ),
  category_count as (
    select count(*)::integer as total
    from published_links
  ),
  games_page as (
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
    from published_links link
    join public.games g on g.id = link.game_id
    cross join args
    order by g.updated_at desc nulls last, g.id desc
    limit (select safe_limit from args)
    offset (select safe_offset from args)
  )
  select jsonb_build_object(
    'category',
    (
      select to_jsonb(c)
      from selected_category c
    ),
    'games',
    coalesce(
      (
        select jsonb_agg(to_jsonb(g) - 'updated_at' order by g.updated_at desc nulls last, g.id desc)
        from games_page g
      ),
      '[]'::jsonb
    ),
    'total',
    coalesce((select total from category_count), 0)
  );
$$;

revoke execute on function public.get_public_category_game_page(text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_public_category_game_page(text, integer, integer) to service_role;

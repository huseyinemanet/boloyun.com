create or replace function public.get_public_game_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_public_game_detail(p_slug) || jsonb_build_object(
    'related_games', '[]'::jsonb,
    'latest_category_games', '[]'::jsonb,
    'popular_category_games', '[]'::jsonb
  );
$$;

comment on function public.get_public_game_page(text) is
  'Backward-compatible game detail payload. Recommendation lists are assembled by the application to avoid per-request temp-disk spills.';

revoke execute on function public.get_public_game_page(text) from public, anon, authenticated;
grant execute on function public.get_public_game_page(text) to service_role;

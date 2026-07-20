create or replace function public.get_trending_published_games(
  p_limit integer default 12
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with recent_plays as (
    select
      play.game_id,
      count(*)::integer as recent_play_count
    from public.game_plays play
    where play.last_played_at >= current_timestamp - interval '7 days'
    group by play.game_id
  ),
  ranked_games as (
    select
      game.id,
      game.title,
      game.slug,
      game.thumbnail_url,
      game.game_type,
      game.status,
      game.rating_avg,
      game.rating_count,
      game.likes_count,
      game.dislikes_count,
      game.play_count,
      game.created_at,
      coalesce(recent.recent_play_count, 0) as recent_play_count
    from public.games game
    left join recent_plays recent on recent.game_id = game.id
    where game.status = 'published'
    order by
      coalesce(recent.recent_play_count, 0) desc,
      coalesce(game.likes_count, 0) desc,
      coalesce(game.play_count, 0) desc,
      game.created_at desc,
      game.id desc
    limit greatest(1, least(coalesce(p_limit, 12), 60))
  )
  select coalesce(
    jsonb_agg(to_jsonb(ranked_games) - array['recent_play_count', 'created_at'] order by
      ranked_games.recent_play_count desc,
      coalesce(ranked_games.likes_count, 0) desc,
      coalesce(ranked_games.play_count, 0) desc,
      ranked_games.created_at desc,
      ranked_games.id desc
    ),
    '[]'::jsonb
  )
  from ranked_games;
$$;

revoke execute on function public.get_trending_published_games(integer) from public, anon, authenticated;
grant execute on function public.get_trending_published_games(integer) to service_role;

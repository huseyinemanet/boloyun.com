create or replace function public.get_continue_playing_games(
  p_profile_id uuid default null,
  p_session_id text default null,
  p_limit integer default 6
)
returns table (
  id uuid,
  title text,
  slug text,
  thumbnail_url text,
  last_played_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with recent_games as (
    select
      play.game_id,
      max(coalesce(play.last_played_at, play.created_at)) as last_played_at
    from public.game_plays play
    where
      (p_profile_id is not null and play.user_id = p_profile_id)
      or (
        length(coalesce(p_session_id, '')) between 16 and 200
        and play.session_id = p_session_id
      )
    group by play.game_id
  )
  select
    game.id,
    game.title,
    game.slug,
    game.thumbnail_url,
    recent.last_played_at
  from recent_games recent
  join public.games game on game.id = recent.game_id
  where game.status = 'published'
  order by recent.last_played_at desc, game.id desc
  limit greatest(1, least(coalesce(p_limit, 6), 12));
$$;

create or replace function public.migrate_session_game_plays_to_profile(
  p_session_id text,
  p_profile_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  if length(coalesce(p_session_id, '')) not between 16 and 200 then
    raise exception 'invalid session';
  end if;
  if not exists (
    select 1
    from public.profiles
    where id = p_profile_id and status = 'active'
  ) then
    raise exception 'profile unavailable';
  end if;

  update public.game_plays
  set user_id = p_profile_id
  where session_id = p_session_id
    and user_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.get_continue_playing_games(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.migrate_session_game_plays_to_profile(text, uuid) from public, anon, authenticated;
grant execute on function public.get_continue_playing_games(uuid, text, integer) to service_role;
grant execute on function public.migrate_session_game_plays_to_profile(text, uuid) to service_role;

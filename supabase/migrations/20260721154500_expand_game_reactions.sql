-- Replace binary votes with six explicit game reactions while preserving the
-- legacy aggregate columns used by ranking and admin reports.

alter table public.game_reactions
  drop constraint if exists game_reactions_vote_check;

update public.game_reactions
set vote = 'angry', updated_at = clock_timestamp()
where vote = 'dislike';

alter table public.game_reactions
  add constraint game_reactions_vote_check
  check (vote in ('like', 'love', 'haha', 'wow', 'sad', 'angry'));

create or replace function public.set_game_reaction_atomic(
  p_game_id uuid,
  p_session_id text,
  p_reaction text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing text;
  v_selected text;
  v_positive integer;
  v_negative integer;
  v_total integer;
  v_average numeric;
begin
  if p_reaction not in ('like', 'love', 'haha', 'wow', 'sad', 'angry')
    or length(trim(p_session_id)) < 16 then
    raise exception 'invalid reaction';
  end if;

  if not exists (
    select 1 from public.games where id = p_game_id and status = 'published'
  ) then
    raise exception 'game not found';
  end if;

  -- Serialize reactions per game so cached aggregate counts cannot lose a
  -- concurrent update between the write and recount steps.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_game_id::text, 0));

  select vote
  into v_existing
  from public.game_reactions
  where game_id = p_game_id and session_id = p_session_id;

  if v_existing = p_reaction then
    delete from public.game_reactions
    where game_id = p_game_id and session_id = p_session_id;
    v_selected := null;
  else
    insert into public.game_reactions(game_id, session_id, vote, updated_at)
    values (p_game_id, p_session_id, p_reaction, clock_timestamp())
    on conflict (game_id, session_id)
    do update set vote = excluded.vote, updated_at = excluded.updated_at;
    v_selected := p_reaction;
  end if;

  select
    count(*) filter (where vote in ('like', 'love', 'haha', 'wow')),
    count(*) filter (where vote in ('sad', 'angry'))
  into v_positive, v_negative
  from public.game_reactions
  where game_id = p_game_id;

  v_total := v_positive + v_negative;
  v_average := case
    when v_total > 0 then round((v_positive::numeric / v_total::numeric) * 5, 2)
    else 0
  end;

  update public.games
  set likes_count = v_positive,
      dislikes_count = v_negative,
      rating_count = v_total,
      rating_avg = v_average,
      updated_at = clock_timestamp()
  where id = p_game_id;

  return jsonb_build_object(
    'selectedReaction', v_selected,
    'likesCount', v_positive,
    'dislikesCount', v_negative,
    'ratingCount', v_total,
    'ratingAvg', v_average
  );
end;
$$;

revoke execute on function public.set_game_reaction_atomic(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_game_reaction_atomic(uuid, text, text)
  to service_role;

-- Keep the previous RPC safe during a rolling application deployment. Old
-- clients that submit "dislike" are translated to the closest new reaction.
create or replace function public.upsert_game_vote_atomic(
  p_game_id uuid,
  p_session_id text,
  p_vote text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_vote not in ('like', 'dislike') then
    raise exception 'invalid vote';
  end if;

  return public.set_game_reaction_atomic(
    p_game_id,
    p_session_id,
    case when p_vote = 'dislike' then 'angry' else p_vote end
  );
end;
$$;

revoke execute on function public.upsert_game_vote_atomic(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.upsert_game_vote_atomic(uuid, text, text)
  to service_role;

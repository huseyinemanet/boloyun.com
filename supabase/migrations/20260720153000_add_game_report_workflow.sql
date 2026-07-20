alter table public.content_reports
  add column if not exists reporter_subject_hash text,
  add column if not exists reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

alter table public.content_reports
  drop constraint if exists content_reports_reason_check;

alter table public.content_reports
  add constraint content_reports_reason_check
  check (reason in (
    'broken', 'not_loading', 'not_playable', 'wrong_content',
    'inappropriate', 'copyright', 'spam', 'other'
  ));

alter table public.content_reports
  drop constraint if exists content_reports_details_length_check;

alter table public.content_reports
  add constraint content_reports_details_length_check
  check (details is null or char_length(details) <= 500);

create index if not exists content_reports_game_created_idx
  on public.content_reports (game_id, created_at desc)
  where game_id is not null;

create index if not exists content_reports_game_status_updated_idx
  on public.content_reports (game_id, status, updated_at desc)
  where game_id is not null;

create unique index if not exists content_reports_open_game_subject_unique_idx
  on public.content_reports (game_id, reporter_subject_hash)
  where game_id is not null
    and reporter_subject_hash is not null
    and status in ('pending', 'reviewing');

create or replace function public.create_game_report_atomic(
  p_game_id uuid,
  p_reporter_profile_id uuid,
  p_reporter_subject_hash text,
  p_reason text,
  p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_report_id uuid;
  v_details text := nullif(trim(coalesce(p_details, '')), '');
begin
  if p_reporter_subject_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid reporter subject';
  end if;

  if p_reason not in ('broken', 'not_loading', 'not_playable', 'wrong_content', 'other') then
    raise exception 'invalid game report reason';
  end if;

  if char_length(coalesce(v_details, '')) > 500 then
    raise exception 'game report details too long';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id and status = 'published';

  if not found then
    raise exception 'published game not found';
  end if;

  insert into public.content_reports (
    reporter_profile_id,
    reporter_subject_hash,
    game_id,
    reason,
    details,
    status,
    updated_at
  ) values (
    p_reporter_profile_id,
    p_reporter_subject_hash,
    p_game_id,
    p_reason,
    v_details,
    'pending',
    clock_timestamp()
  )
  on conflict (game_id, reporter_subject_hash)
    where game_id is not null
      and reporter_subject_hash is not null
      and status in ('pending', 'reviewing')
  do nothing
  returning id into v_report_id;

  if v_report_id is null then
    update public.content_reports
    set
      details = coalesce(v_details, details),
      updated_at = clock_timestamp()
    where game_id = p_game_id
      and reporter_subject_hash = p_reporter_subject_hash
      and status in ('pending', 'reviewing')
    returning id into v_report_id;

    return jsonb_build_object(
      'id', v_report_id,
      'created', false,
      'game_title', v_game.title,
      'game_slug', v_game.slug
    );
  end if;

  return jsonb_build_object(
    'id', v_report_id,
    'created', true,
    'game_title', v_game.title,
    'game_slug', v_game.slug
  );
end;
$$;

revoke execute on function public.create_game_report_atomic(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_game_report_atomic(uuid, uuid, text, text, text)
  to service_role;

-- Production-readiness hardening for data integrity, abuse controls and
-- atomic public write paths. All privileged RPCs are service-role only.

create extension if not exists pgcrypto with schema extensions;

-- Existing live rows were audited before this migration: these columns do not
-- contain nulls and are required by every application write path.
alter table public.profiles alter column user_id set not null;
alter table public.comments alter column game_id set not null;
alter table public.comments alter column user_id set not null;
alter table public.ratings alter column game_id set not null;
alter table public.ratings alter column user_id set not null;
alter table public.game_plays alter column game_id set not null;
alter table public.ads alter column slot_id set not null;

alter table public.game_plays
  drop constraint if exists game_plays_user_id_fkey;
alter table public.game_plays
  add constraint game_plays_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'categories_status_check') then
    alter table public.categories add constraint categories_status_check check (status in ('active', 'inactive'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tags_status_check') then
    alter table public.tags add constraint tags_status_check check (status in ('active', 'inactive'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'static_pages_status_check') then
    alter table public.static_pages add constraint static_pages_status_check check (status in ('draft', 'published'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comments_status_check') then
    alter table public.comments add constraint comments_status_check check (status in ('pending', 'approved', 'rejected', 'hidden', 'spam', 'trash'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_sections_status_check') then
    alter table public.homepage_sections add constraint homepage_sections_status_check check (status in ('active', 'inactive'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_sections_visibility_check') then
    alter table public.homepage_sections add constraint homepage_sections_visibility_check check (visibility in ('all', 'desktop', 'mobile', 'members'));
  end if;
end $$;

create unique index if not exists games_slug_lower_unique_idx on public.games (lower(slug));
create unique index if not exists categories_slug_lower_unique_idx on public.categories (lower(slug));
create unique index if not exists tags_slug_lower_unique_idx on public.tags (lower(slug));
create unique index if not exists static_pages_slug_lower_unique_idx on public.static_pages (lower(slug));
create unique index if not exists profiles_username_lower_unique_idx on public.profiles (lower(username));
create unique index if not exists games_source_url_unique_idx on public.games (source_url) where source_url is not null;

create index if not exists game_categories_category_game_idx on public.game_categories (category_id, game_id);
create index if not exists game_tags_tag_game_idx on public.game_tags (tag_id, game_id);
create index if not exists game_imports_status_updated_idx on public.game_imports (import_status, updated_at desc);
create index if not exists games_updated_idx on public.games (updated_at desc);
create index if not exists comments_status_created_idx on public.comments (status, created_at desc);
create index if not exists comments_user_created_idx on public.comments (user_id, created_at desc);
create index if not exists comments_user_game_created_idx on public.comments (user_id, game_id, created_at desc);
create index if not exists game_plays_session_game_played_idx on public.game_plays (session_id, game_id, last_played_at desc);
create index if not exists game_plays_user_played_idx on public.game_plays (user_id, last_played_at desc) where user_id is not null;
create index if not exists favorites_game_idx on public.favorites (game_id);
create index if not exists ratings_game_idx on public.ratings (game_id);
create index if not exists ads_slot_active_priority_idx on public.ads (slot_id, is_active, priority desc, updated_at desc);

alter table public.game_imports add column if not exists published_game_id uuid references public.games(id) on delete set null;
create index if not exists game_imports_published_game_idx on public.game_imports (published_game_id) where published_game_id is not null;

create table if not exists public.rate_limit_buckets (
  action text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  expires_at timestamptz not null,
  primary key (action, subject_hash, window_started_at)
);
create index if not exists rate_limit_buckets_expires_idx on public.rate_limit_buckets (expires_at);
alter table public.rate_limit_buckets enable row level security;

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,
  destination_path text not null,
  status_code integer not null default 308 check (status_code in (301, 308)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint redirects_source_path_format check (source_path like '/%' and source_path not like '//%'),
  constraint redirects_destination_path_format check (destination_path like '/%' and destination_path not like '//%'),
  constraint redirects_no_self_redirect check (source_path <> destination_path)
);
create unique index if not exists redirects_source_lower_unique_idx on public.redirects (lower(source_path));
alter table public.redirects enable row level security;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  game_id uuid references public.games(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null check (reason in ('broken', 'inappropriate', 'copyright', 'spam', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_reports_target_check check ((game_id is not null)::integer + (comment_id is not null)::integer = 1)
);
create index if not exists content_reports_status_created_idx on public.content_reports (status, created_at desc);
create index if not exists content_reports_reporter_created_idx on public.content_reports (reporter_profile_id, created_at desc) where reporter_profile_id is not null;
alter table public.content_reports enable row level security;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('logo', 'favicon', 'cover', 'avatar')),
  storage_key text not null unique,
  public_url text not null,
  content_hash text not null,
  byte_size bigint not null check (byte_size > 0),
  mime_type text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  status text not null default 'active' check (status in ('active', 'orphaned', 'deleted')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists media_assets_owner_created_idx on public.media_assets (owner_profile_id, created_at desc) where owner_profile_id is not null;
create index if not exists media_assets_cleanup_idx on public.media_assets (status, created_at) where status <> 'active';
alter table public.media_assets enable row level security;

create or replace function public.consume_rate_limit(
  p_action text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_started timestamptz;
  v_count integer;
begin
  if length(trim(p_action)) < 2 or length(trim(p_subject_hash)) < 16 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;
  v_started := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_buckets(action, subject_hash, window_started_at, request_count, expires_at)
  values (p_action, p_subject_hash, v_started, 1, v_started + make_interval(secs => p_window_seconds * 2))
  on conflict (action, subject_hash, window_started_at)
  do update set request_count = public.rate_limit_buckets.request_count + 1
  returning request_count into v_count;

  return query select
    v_count <= p_limit,
    greatest(0, p_limit - v_count),
    greatest(1, ceil(extract(epoch from (v_started + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer);
end;
$$;

create or replace function public.record_game_play_atomic(
  p_game_id uuid,
  p_session_id text,
  p_profile_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(trim(p_session_id)) < 16 then raise exception 'invalid session'; end if;
  if not exists (select 1 from public.games where id = p_game_id and status = 'published') then return false; end if;
  if exists (
    select 1 from public.game_plays
    where game_id = p_game_id and session_id = p_session_id
      and last_played_at >= clock_timestamp() - interval '30 minutes'
  ) then return false; end if;

  insert into public.game_plays(game_id, user_id, session_id, last_played_at)
  values (p_game_id, p_profile_id, p_session_id, clock_timestamp());
  update public.games
    set play_count = coalesce(play_count, 0) + 1, updated_at = clock_timestamp()
    where id = p_game_id;
  return true;
end;
$$;

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
declare
  v_likes integer;
  v_dislikes integer;
  v_total integer;
  v_average numeric;
begin
  if p_vote not in ('like', 'dislike') or length(trim(p_session_id)) < 16 then
    raise exception 'invalid vote';
  end if;
  if not exists (select 1 from public.games where id = p_game_id and status = 'published') then
    raise exception 'game not found';
  end if;

  insert into public.game_reactions(game_id, session_id, vote, updated_at)
  values (p_game_id, p_session_id, p_vote, clock_timestamp())
  on conflict (game_id, session_id)
  do update set vote = excluded.vote, updated_at = excluded.updated_at;

  select count(*) filter (where vote = 'like'), count(*) filter (where vote = 'dislike')
    into v_likes, v_dislikes
    from public.game_reactions where game_id = p_game_id;
  v_total := v_likes + v_dislikes;
  v_average := case when v_total > 0 then round((v_likes::numeric / v_total::numeric) * 5, 2) else 0 end;

  update public.games set
    likes_count = v_likes,
    dislikes_count = v_dislikes,
    rating_count = v_total,
    rating_avg = v_average,
    updated_at = clock_timestamp()
  where id = p_game_id;

  return jsonb_build_object('likesCount', v_likes, 'dislikesCount', v_dislikes, 'ratingCount', v_total, 'ratingAvg', v_average);
end;
$$;

create or replace function public.create_comment_atomic(
  p_game_id uuid,
  p_profile_id uuid,
  p_body text,
  p_status text,
  p_daily_limit integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_created_at timestamptz;
  v_effective_daily_limit integer;
  v_normalized_body text;
begin
  if length(trim(p_body)) < 3 or length(trim(p_body)) > 1000 then raise exception 'invalid comment length'; end if;
  if p_status not in ('pending', 'approved') then raise exception 'invalid comment status'; end if;
  select created_at into v_created_at from public.profiles where id = p_profile_id and status = 'active' for update;
  if v_created_at is null then raise exception 'profile unavailable'; end if;
  if not exists (select 1 from public.games where id = p_game_id and status = 'published') then raise exception 'game unavailable'; end if;

  v_effective_daily_limit := case when v_created_at > clock_timestamp() - interval '24 hours' then least(p_daily_limit, 3) else p_daily_limit end;
  if (select count(*) from public.comments where user_id = p_profile_id and created_at >= clock_timestamp() - interval '10 minutes') >= 5 then
    raise exception 'comment rate exceeded';
  end if;
  if (select count(*) from public.comments where user_id = p_profile_id and created_at >= date_trunc('day', clock_timestamp())) >= v_effective_daily_limit then
    raise exception 'comment daily limit exceeded';
  end if;
  v_normalized_body := regexp_replace(lower(trim(p_body)), '\s+', ' ', 'g');
  if exists (
    select 1 from public.comments
    where user_id = p_profile_id and game_id = p_game_id
      and created_at >= clock_timestamp() - interval '24 hours'
      and regexp_replace(lower(trim(body)), '\s+', ' ', 'g') = v_normalized_body
  ) then raise exception 'duplicate comment'; end if;

  insert into public.comments(game_id, user_id, body, status)
  values (p_game_id, p_profile_id, trim(p_body), p_status)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_game_atomic(
  p_game_id uuid,
  p_game jsonb,
  p_category_ids uuid[],
  p_tags jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_tag jsonb;
  v_tag_id uuid;
begin
  v_game := jsonb_populate_record(null::public.games, p_game);
  update public.games set
    title = v_game.title, slug = v_game.slug, status = v_game.status,
    short_description = v_game.short_description, long_description = v_game.long_description,
    how_to_play = v_game.how_to_play, controls = v_game.controls, features = v_game.features,
    developer = v_game.developer, thumbnail_url = v_game.thumbnail_url,
    thumbnail_source_url = v_game.thumbnail_source_url, thumbnail_r2_key = v_game.thumbnail_r2_key,
    thumbnail_sync_status = v_game.thumbnail_sync_status, thumbnail_sync_error = v_game.thumbnail_sync_error,
    thumbnail_synced_at = v_game.thumbnail_synced_at, game_type = v_game.game_type,
    embed_url = v_game.embed_url, swf_url = v_game.swf_url, html5_url = v_game.html5_url,
    external_url = v_game.external_url, seo_title = v_game.seo_title,
    seo_description = v_game.seo_description, primary_category_id = v_game.primary_category_id,
    og_image_url = v_game.og_image_url, is_indexable = v_game.is_indexable,
    is_broken = v_game.is_broken, updated_at = clock_timestamp()
  where id = p_game_id;
  if not found then raise exception 'game not found'; end if;

  delete from public.game_categories where game_id = p_game_id;
  insert into public.game_categories(game_id, category_id)
    select p_game_id, category_id from unnest(coalesce(p_category_ids, array[]::uuid[])) category_id
    on conflict do nothing;

  delete from public.game_tags where game_id = p_game_id;
  for v_tag in select value from jsonb_array_elements(coalesce(p_tags, '[]'::jsonb)) loop
    insert into public.tags(name, slug, status, updated_at)
    values (trim(v_tag->>'name'), trim(v_tag->>'slug'), 'active', clock_timestamp())
    on conflict (slug) do update set name = excluded.name, status = 'active', updated_at = excluded.updated_at
    returning id into v_tag_id;
    insert into public.game_tags(game_id, tag_id) values (p_game_id, v_tag_id) on conflict do nothing;
  end loop;
end;
$$;

create or replace function public.save_homepage_sections_atomic(p_sections jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_section jsonb;
begin
  if jsonb_typeof(p_sections) <> 'array' or jsonb_array_length(p_sections) > 100 then
    raise exception 'invalid homepage sections';
  end if;
  delete from public.homepage_sections;
  for v_section in select value from jsonb_array_elements(p_sections) loop
    insert into public.homepage_sections(
      id, title, section_type, source_type, source_id, manual_game_ids,
      limit_count, sort_order, visibility, status, updated_at
    ) values (
      coalesce(nullif(v_section->>'id', '')::uuid, gen_random_uuid()),
      v_section->>'title', v_section->>'section_type', nullif(v_section->>'source_type', ''),
      nullif(v_section->>'source_id', '')::uuid, coalesce(v_section->'manual_game_ids', '[]'::jsonb),
      (v_section->>'limit_count')::integer, (v_section->>'sort_order')::integer,
      v_section->>'visibility', v_section->>'status', clock_timestamp()
    );
  end loop;
end;
$$;

revoke all on table public.rate_limit_buckets, public.redirects, public.content_reports, public.media_assets from anon, authenticated;
revoke execute on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.record_game_play_atomic(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.upsert_game_vote_atomic(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.create_comment_atomic(uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.update_game_atomic(uuid, jsonb, uuid[], jsonb) from public, anon, authenticated;
revoke execute on function public.save_homepage_sections_atomic(jsonb) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.record_game_play_atomic(uuid, text, uuid) to service_role;
grant execute on function public.upsert_game_vote_atomic(uuid, text, text) to service_role;
grant execute on function public.create_comment_atomic(uuid, uuid, text, text, integer) to service_role;
grant execute on function public.update_game_atomic(uuid, jsonb, uuid[], jsonb) to service_role;
grant execute on function public.save_homepage_sections_atomic(jsonb) to service_role;

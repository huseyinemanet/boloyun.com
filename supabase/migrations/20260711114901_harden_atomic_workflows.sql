-- Atomic publication, favorite, and administrator mutation boundaries.

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_ids uuid[] not null default array[]::uuid[],
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_events_created_idx on public.admin_audit_events(created_at desc);
create index if not exists admin_audit_events_actor_created_idx on public.admin_audit_events(actor_profile_id, created_at desc);
alter table public.admin_audit_events enable row level security;
revoke all on table public.admin_audit_events from anon, authenticated;

create or replace function public.publish_game_import_atomic(
  p_import_id uuid,
  p_game jsonb,
  p_category_ids uuid[],
  p_tags jsonb
)
returns table(id uuid, slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_import public.game_imports;
  v_game public.games;
  v_game_id uuid;
  v_slug text;
  v_tag jsonb;
  v_tag_id uuid;
begin
  select * into v_import
  from public.game_imports
  where game_imports.id = p_import_id
  for update;

  if not found then raise exception 'import not found'; end if;
  if v_import.import_status not in ('scraped', 'ai_generated', 'pending_review', 'approved') then
    raise exception 'import is not publishable';
  end if;
  if jsonb_typeof(coalesce(p_tags, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_tags, '[]'::jsonb)) > 12 then
    raise exception 'invalid tags';
  end if;
  if cardinality(coalesce(p_category_ids, array[]::uuid[])) > 6 then raise exception 'invalid categories'; end if;

  v_game := jsonb_populate_record(null::public.games, p_game);
  if v_game.source_url is null or v_game.source_url <> v_import.source_url then raise exception 'source mismatch'; end if;
  if v_game.status <> 'published' then raise exception 'game must be published'; end if;

  select games.id into v_game_id
  from public.games
  where games.source_url = v_import.source_url
  for update;

  if v_game_id is null then
    insert into public.games (
      title, slug, short_description, long_description, how_to_play, controls, features,
      developer, thumbnail_url, thumbnail_source_url, thumbnail_r2_key, thumbnail_sync_status,
      thumbnail_sync_error, thumbnail_synced_at, game_type, embed_url, swf_url, html5_url,
      external_url, source_url, source_domain, status, seo_title, seo_description,
      primary_category_id, og_image_url, is_indexable, is_broken, updated_at
    ) values (
      v_game.title, v_game.slug, v_game.short_description, v_game.long_description, v_game.how_to_play,
      v_game.controls, v_game.features, v_game.developer, v_game.thumbnail_url,
      v_game.thumbnail_source_url, v_game.thumbnail_r2_key, v_game.thumbnail_sync_status,
      v_game.thumbnail_sync_error, v_game.thumbnail_synced_at, v_game.game_type, v_game.embed_url,
      v_game.swf_url, v_game.html5_url, v_game.external_url, v_game.source_url, v_game.source_domain,
      v_game.status, v_game.seo_title, v_game.seo_description, v_game.primary_category_id,
      v_game.og_image_url, v_game.is_indexable, v_game.is_broken, clock_timestamp()
    ) returning games.id, games.slug into v_game_id, v_slug;
  else
    update public.games set
      title = v_game.title, slug = v_game.slug, short_description = v_game.short_description,
      long_description = v_game.long_description, how_to_play = v_game.how_to_play,
      controls = v_game.controls, features = v_game.features, developer = v_game.developer,
      thumbnail_url = v_game.thumbnail_url, thumbnail_source_url = v_game.thumbnail_source_url,
      thumbnail_r2_key = v_game.thumbnail_r2_key, thumbnail_sync_status = v_game.thumbnail_sync_status,
      thumbnail_sync_error = v_game.thumbnail_sync_error, thumbnail_synced_at = v_game.thumbnail_synced_at,
      game_type = v_game.game_type, embed_url = v_game.embed_url, swf_url = v_game.swf_url,
      html5_url = v_game.html5_url, external_url = v_game.external_url, source_domain = v_game.source_domain,
      status = v_game.status, seo_title = v_game.seo_title, seo_description = v_game.seo_description,
      primary_category_id = v_game.primary_category_id, og_image_url = v_game.og_image_url,
      is_indexable = v_game.is_indexable, is_broken = v_game.is_broken, updated_at = clock_timestamp()
    where games.id = v_game_id
    returning games.slug into v_slug;
  end if;

  delete from public.game_categories where game_id = v_game_id;
  insert into public.game_categories(game_id, category_id)
    select v_game_id, category_id
    from unnest(coalesce(p_category_ids, array[]::uuid[])) category_id
    on conflict do nothing;

  delete from public.game_tags where game_id = v_game_id;
  for v_tag in select value from jsonb_array_elements(coalesce(p_tags, '[]'::jsonb)) loop
    if length(trim(v_tag->>'name')) < 2 or length(trim(v_tag->>'slug')) < 1 then raise exception 'invalid tag'; end if;
    insert into public.tags(name, slug, status, updated_at)
    values (trim(v_tag->>'name'), trim(v_tag->>'slug'), 'active', clock_timestamp())
    on conflict (slug) do update set name = excluded.name, status = 'active', updated_at = excluded.updated_at
    returning tags.id into v_tag_id;
    insert into public.game_tags(game_id, tag_id) values (v_game_id, v_tag_id) on conflict do nothing;
  end loop;

  update public.game_imports set
    import_status = 'approved', published_game_id = v_game_id, error_message = null,
    updated_at = clock_timestamp()
  where game_imports.id = p_import_id;

  return query select v_game_id, v_slug;
end;
$$;

create or replace function public.set_favorite_atomic(
  p_game_id uuid,
  p_profile_id uuid,
  p_session_id text,
  p_desired boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.games where id = p_game_id and status = 'published') then
    raise exception 'game unavailable';
  end if;
  if p_profile_id is not null then
    if not exists (select 1 from public.profiles where id = p_profile_id and status = 'active') then raise exception 'profile unavailable'; end if;
    if p_desired then
      insert into public.favorites(user_id, game_id) values (p_profile_id, p_game_id) on conflict do nothing;
    else
      delete from public.favorites where user_id = p_profile_id and game_id = p_game_id;
    end if;
  elsif length(coalesce(p_session_id, '')) >= 16 then
    if p_desired then
      insert into public.session_favorites(game_id, session_id) values (p_game_id, p_session_id) on conflict do nothing;
    else
      delete from public.session_favorites where game_id = p_game_id and session_id = p_session_id;
    end if;
  else
    raise exception 'favorite owner unavailable';
  end if;
  return p_desired;
end;
$$;

create or replace function public.migrate_session_favorites_atomic(p_session_id text, p_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if length(coalesce(p_session_id, '')) < 16 then raise exception 'invalid session'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id and status = 'active') then raise exception 'profile unavailable'; end if;
  insert into public.favorites(user_id, game_id)
    select p_profile_id, game_id from public.session_favorites where session_id = p_session_id
    on conflict do nothing;
  get diagnostics v_count = row_count;
  delete from public.session_favorites where session_id = p_session_id;
  return v_count;
end;
$$;

create or replace function public.update_admin_profiles_atomic(
  p_profile_ids uuid[],
  p_role text default null,
  p_status text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
  v_remaining integer;
begin
  if cardinality(coalesce(p_profile_ids, array[]::uuid[])) < 1 then return 0; end if;
  if p_role is not null and p_role not in ('admin', 'member') then raise exception 'invalid role'; end if;
  if p_status is not null and p_status not in ('active', 'blocked') then raise exception 'invalid status'; end if;
  perform pg_advisory_xact_lock(hashtext('boloyun-active-admins'));

  select count(*) into v_remaining
  from public.profiles
  where role = 'admin' and status = 'active'
    and not (
      id = any(p_profile_ids)
      and (coalesce(p_role, role) <> 'admin' or coalesce(p_status, status) <> 'active')
    );
  if v_remaining < 1 then raise exception 'last active admin cannot be removed'; end if;

  update public.profiles set
    role = coalesce(p_role, role), status = coalesce(p_status, status), updated_at = clock_timestamp()
  where id = any(p_profile_ids);
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.get_tag_published_counts(p_tag_ids uuid[])
returns table(tag_id uuid, published_count bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select gt.tag_id, count(*)
  from public.game_tags gt
  join public.games g on g.id = gt.game_id and g.status = 'published'
  where gt.tag_id = any(coalesce(p_tag_ids, array[]::uuid[]))
  group by gt.tag_id;
$$;

create or replace function public.get_profile_engagement_counts(p_profile_ids uuid[])
returns table(profile_id uuid, comment_count bigint, favorite_count bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id,
    (select count(*) from public.comments c where c.user_id = p.id),
    (select count(*) from public.favorites f where f.user_id = p.id)
  from public.profiles p
  where p.id = any(coalesce(p_profile_ids, array[]::uuid[]));
$$;

create or replace function public.save_appearance_and_homepage_atomic(
  p_value jsonb,
  p_expected_version integer,
  p_changed_by uuid,
  p_changed_by_label text,
  p_sections jsonb
)
returns setof public.site_settings
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query select * from public.save_site_settings(
    'appearance', p_value, p_expected_version, p_changed_by, p_changed_by_label, null
  );
  perform public.save_homepage_sections_atomic(p_sections);
end;
$$;

-- Bound per-subject rate-limit growth during normal traffic.
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
  delete from public.rate_limit_buckets
    where action = p_action and subject_hash = p_subject_hash and expires_at < clock_timestamp();
  v_started := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_buckets(action, subject_hash, window_started_at, request_count, expires_at)
  values (p_action, p_subject_hash, v_started, 1, v_started + make_interval(secs => p_window_seconds * 2))
  on conflict (action, subject_hash, window_started_at)
  do update set request_count = public.rate_limit_buckets.request_count + 1
  returning request_count into v_count;
  return query select v_count <= p_limit, greatest(0, p_limit - v_count),
    greatest(1, ceil(extract(epoch from (v_started + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer);
end;
$$;

revoke execute on function public.publish_game_import_atomic(uuid, jsonb, uuid[], jsonb) from public, anon, authenticated;
revoke execute on function public.set_favorite_atomic(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.migrate_session_favorites_atomic(text, uuid) from public, anon, authenticated;
revoke execute on function public.update_admin_profiles_atomic(uuid[], text, text) from public, anon, authenticated;
revoke execute on function public.get_tag_published_counts(uuid[]) from public, anon, authenticated;
revoke execute on function public.get_profile_engagement_counts(uuid[]) from public, anon, authenticated;
revoke execute on function public.save_appearance_and_homepage_atomic(jsonb, integer, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_game_import_atomic(uuid, jsonb, uuid[], jsonb) to service_role;
grant execute on function public.set_favorite_atomic(uuid, uuid, text, boolean) to service_role;
grant execute on function public.migrate_session_favorites_atomic(text, uuid) to service_role;
grant execute on function public.update_admin_profiles_atomic(uuid[], text, text) to service_role;
grant execute on function public.get_tag_published_counts(uuid[]) to service_role;
grant execute on function public.get_profile_engagement_counts(uuid[]) to service_role;
grant execute on function public.save_appearance_and_homepage_atomic(jsonb, integer, uuid, text, jsonb) to service_role;

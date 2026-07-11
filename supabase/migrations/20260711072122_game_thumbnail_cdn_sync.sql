alter table public.games
  add column if not exists thumbnail_source_url text,
  add column if not exists thumbnail_r2_key text,
  add column if not exists thumbnail_sync_status text not null default 'pending',
  add column if not exists thumbnail_sync_error text,
  add column if not exists thumbnail_synced_at timestamptz;

update public.games
set
  thumbnail_source_url = coalesce(thumbnail_source_url, thumbnail_url),
  thumbnail_sync_status = case
    when thumbnail_url like 'https://cdn.boloyun.com/covers/%' then 'synced'
    else 'pending'
  end,
  thumbnail_synced_at = case
    when thumbnail_url like 'https://cdn.boloyun.com/covers/%' then coalesce(thumbnail_synced_at, updated_at, now())
    else thumbnail_synced_at
  end
where thumbnail_url is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'games_thumbnail_sync_status_check'
      and conrelid = 'public.games'::regclass
  ) then
    alter table public.games
      add constraint games_thumbnail_sync_status_check
      check (thumbnail_sync_status in ('pending', 'syncing', 'synced', 'failed', 'rolled_back'));
  end if;
end $$;

create index if not exists games_thumbnail_sync_queue_idx
  on public.games (thumbnail_sync_status, updated_at, id);

create index if not exists games_thumbnail_r2_key_idx
  on public.games (thumbnail_r2_key)
  where thumbnail_r2_key is not null;

comment on column public.games.thumbnail_source_url is 'Original external cover URL retained for retry and rollback.';
comment on column public.games.thumbnail_r2_key is 'Content-addressed Cloudflare R2 object key.';
comment on column public.games.thumbnail_sync_status is 'pending, syncing, synced, failed, or rolled_back.';

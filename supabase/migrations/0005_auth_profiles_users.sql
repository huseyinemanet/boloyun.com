alter table profiles
  add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'active',
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists website text;

do $$
begin
  alter table profiles add constraint profiles_role_check check (role in ('admin', 'member'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table profiles add constraint profiles_status_check check (status in ('active', 'blocked'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists profiles_user_id_unique_idx on profiles (user_id);
create index if not exists profiles_role_status_idx on profiles (role, status);
create index if not exists profiles_created_at_idx on profiles (created_at desc);

create or replace function public.is_admin(auth_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where user_id = auth_user_id
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  next_username text;
  full_name text;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(split_part(new.email, '@', 1), ''),
    'oyuncu'
  );
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]+', '-', 'g'));
  base_username := trim(both '-' from base_username);
  if base_username = '' then
    base_username := 'oyuncu';
  end if;

  next_username := base_username;
  if exists (select 1 from profiles where username = next_username) then
    next_username := base_username || '-' || substring(new.id::text from 1 for 8);
  end if;

  full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', '')
  );

  insert into profiles (
    user_id,
    username,
    avatar_url,
    first_name,
    last_name,
    display_name,
    role,
    status,
    terms_accepted_at,
    marketing_emails_accepted
  )
  values (
    new.id,
    next_username,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), full_name, next_username),
    'member',
    'active',
    case when (new.raw_user_meta_data->>'terms_accepted')::boolean then now() else null end,
    coalesce((new.raw_user_meta_data->>'marketing_emails_accepted')::boolean, false)
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

drop policy if exists "profiles readable by owner or admin" on profiles;
create policy "profiles readable by owner or admin"
  on profiles for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "profiles editable by owner" on profiles;
create policy "profiles editable by owner"
  on profiles for update
  using (auth.uid() = user_id and status = 'active')
  with check (
    auth.uid() = user_id
    and role = (select role from profiles where user_id = auth.uid())
  );

drop policy if exists "admins manage profiles" on profiles;
create policy "admins manage profiles"
  on profiles for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "owners manage favorites" on favorites;
create policy "owners manage favorites"
  on favorites for all
  using (exists (select 1 from profiles where profiles.id = favorites.user_id and profiles.user_id = auth.uid()))
  with check (exists (select 1 from profiles where profiles.id = favorites.user_id and profiles.user_id = auth.uid()));

drop policy if exists "owners manage ratings" on ratings;
create policy "owners manage ratings"
  on ratings for all
  using (exists (select 1 from profiles where profiles.id = ratings.user_id and profiles.user_id = auth.uid()))
  with check (exists (select 1 from profiles where profiles.id = ratings.user_id and profiles.user_id = auth.uid()));

drop policy if exists "approved comments are public" on comments;
create policy "approved comments are public"
  on comments for select
  using (status = 'approved' or public.is_admin(auth.uid()));

drop policy if exists "signed in users create pending comments" on comments;
create policy "signed in users create pending comments"
  on comments for insert
  with check (exists (select 1 from profiles where profiles.id = comments.user_id and profiles.user_id = auth.uid()));

drop policy if exists "admins manage comments" on comments;
create policy "admins manage comments"
  on comments for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

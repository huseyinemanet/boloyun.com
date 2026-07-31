-- Member writes are handled by validated server routes and service-role RPCs.
-- Keep the public read contracts, but remove the direct Data API paths that
-- could bypass moderation, rate limits, blocked-account checks, or safe defaults.

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
    and exists (
      select 1
      from public.profiles
      where user_id = (select auth.uid())
        and role = 'admin'
        and status = 'active'
    );
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

drop policy if exists "signed in users create pending comments" on public.comments;
revoke insert, update, delete on table public.comments from anon, authenticated;

drop policy if exists "owners manage favorites" on public.favorites;
create policy "active owners read favorites"
  on public.favorites
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = favorites.user_id
        and profiles.user_id = (select auth.uid())
        and profiles.status = 'active'
    )
  );
revoke insert, update, delete on table public.favorites from anon, authenticated;

drop policy if exists "owners manage ratings" on public.ratings;
create policy "active owners read ratings"
  on public.ratings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = ratings.user_id
        and profiles.user_id = (select auth.uid())
        and profiles.status = 'active'
    )
  );
revoke insert, update, delete on table public.ratings from anon, authenticated;

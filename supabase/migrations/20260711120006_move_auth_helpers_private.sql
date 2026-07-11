create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'admin' and status = 'active'
  );
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

drop policy if exists "profiles readable by owner or admin" on public.profiles;
create policy "profiles readable by owner or admin" on public.profiles for select
  using ((select auth.uid()) = user_id or private.is_admin());

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "approved comments are public" on public.comments;
create policy "approved comments are public" on public.comments for select
  using (status = 'approved' or private.is_admin());

drop policy if exists "admins manage comments" on public.comments;
create policy "admins manage comments" on public.comments for all
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admins read site settings" on public.site_settings;
create policy "admins read site settings" on public.site_settings for select
  using (private.is_admin());

drop policy if exists "admins update site settings" on public.site_settings;
create policy "admins update site settings" on public.site_settings for update
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admins read site setting revisions" on public.site_setting_revisions;
create policy "admins read site setting revisions" on public.site_setting_revisions for select
  using (private.is_admin());

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
drop function if exists public.is_admin(uuid);

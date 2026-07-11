create table if not exists public.site_settings (
  section text primary key check (section in ('general', 'appearance', 'games', 'seo', 'ads', 'community', 'integrations', 'security', 'system')),
  value jsonb not null default '{}'::jsonb check (jsonb_typeof(value) = 'object'),
  version integer not null default 1 check (version > 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_by_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_setting_revisions (
  id uuid primary key default gen_random_uuid(),
  section text not null references public.site_settings(section) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  changed_keys text[] not null default '{}',
  changed_by uuid references public.profiles(id) on delete set null,
  changed_by_label text,
  restored_from_revision_id uuid references public.site_setting_revisions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (section, version)
);

create index if not exists site_setting_revisions_section_created_idx
  on public.site_setting_revisions (section, created_at desc);

alter table public.site_settings enable row level security;
alter table public.site_setting_revisions enable row level security;

drop policy if exists "admins read site settings" on public.site_settings;
create policy "admins read site settings"
  on public.site_settings for select
  to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "admins update site settings" on public.site_settings;
create policy "admins update site settings"
  on public.site_settings for update
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

drop policy if exists "admins read site setting revisions" on public.site_setting_revisions;
create policy "admins read site setting revisions"
  on public.site_setting_revisions for select
  to authenticated
  using (public.is_admin((select auth.uid())));

insert into public.site_settings (section, value)
values
  ('general', '{"siteName":"Bol Oyun","tagline":"Oyunu seç, hemen oyna","description":"En sevilen mini oyunları, klasik Flash oyunlarını, araba, aksiyon, spor ve beceri oyunlarını ücretsiz oyna.","contactEmail":"iletisim@boloyun.com","locale":"tr-TR","timezone":"Europe/Istanbul","maintenanceMode":false,"registrationsEnabled":true,"logoUrl":"/logo.svg","faviconUrl":"/favicon.ico","defaultCoverUrl":"/opengraph-image"}'::jsonb),
  ('appearance', '{"heroTitle":"Ücretsiz Mini Oyunlar Oyna","heroDescription":"Bol Oyun’da aksiyon, araba, futbol, zombi, çocuk, beceri ve klasik Flash oyunlarını keşfet. Oyunu seç, Oyunu Başlat butonuna bas ve indirme yapmadan tarayıcıda oyna.","announcementEnabled":false,"announcementText":"","announcementUrl":""}'::jsonb),
  ('games', '{"playerAspectRatio":"16:9","allowFullscreen":true,"loadTimeoutSeconds":20,"allowGuestPlay":true,"showPlayCount":true,"likesEnabled":true,"favoritesEnabled":true,"sharingEnabled":true,"similarGameStrategy":"taxonomy"}'::jsonb),
  ('seo', '{"defaultTitle":"Ücretsiz Oyunlar Oyna","defaultTitleTemplate":"{{sayfa}} | {{site_adı}}","defaultDescription":"En sevilen mini oyunları, klasik Flash oyunlarını, araba, aksiyon, spor ve beceri oyunlarını ücretsiz oyna.","gameTitleTemplate":"{{oyun_adı}} Oyna – {{site_adı}}","categoryTitleTemplate":"{{kategori_adı}} Oyunları – {{site_adı}}","categoryDescriptionTemplate":"En sevilen {{kategori_adı}} oyunlarını {{site_adı}}’da ücretsiz oyna.","canonicalDomain":"https://boloyun.com","openGraphImageUrl":"/opengraph-image","robotsDisallow":["/admin","/api","/auth","/giris","/kayit","/sifremi-unuttum","/sifre-yenile","/profil"],"sitemapEnabled":true,"sitemapIncludeTags":true,"sitemapIncludeStaticPages":true,"searchIndexable":false,"structuredDataEnabled":true,"googleVerification":"","bingVerification":""}'::jsonb),
  ('ads', '{"enabled":true,"showToMembers":true,"preRollEnabled":false,"preRollSkipSeconds":5,"adsTxt":""}'::jsonb),
  ('community', '{"registrationsEnabled":true,"emailVerificationRequired":false,"usernameMinLength":3,"usernameMaxLength":29,"usernamePattern":"^[a-zA-Z0-9_][a-zA-Z0-9_-]*$","minimumAge":0,"profilePhotoEnabled":true,"commentsEnabled":true,"commentsRequireApproval":true,"blockedWords":[],"dailyCommentLimit":20,"ratingsEnabled":true,"favoritesEnabled":true}'::jsonb),
  ('integrations', '{"googleAnalyticsId":"","googleTagManagerId":"","clarityProjectId":"","metaPixelId":"","consentModeEnabled":true}'::jsonb),
  ('security', '{"uploadMaxMb":5,"allowedUploadMimeTypes":["image/png","image/jpeg","image/webp","image/x-icon","image/vnd.microsoft.icon"],"iframeAllowlist":[],"enforceIframeAllowlist":false}'::jsonb),
  ('system', '{}'::jsonb)
on conflict (section) do nothing;

insert into public.site_setting_revisions (section, version, snapshot, changed_keys, changed_by_label)
select section, version, value, array(select jsonb_object_keys(value)), 'Sistem başlangıcı'
from public.site_settings
on conflict (section, version) do nothing;

create or replace function public.save_site_settings(
  p_section text,
  p_value jsonb,
  p_expected_version integer,
  p_changed_by uuid default null,
  p_changed_by_label text default null,
  p_restored_from_revision_id uuid default null
)
returns public.site_settings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row public.site_settings;
  saved_row public.site_settings;
  changed text[];
begin
  if jsonb_typeof(p_value) is distinct from 'object' then
    raise exception 'Ayar verisi JSON nesnesi olmalıdır.' using errcode = '22023';
  end if;

  select * into current_row
  from public.site_settings
  where section = p_section
  for update;

  if not found then
    raise exception 'Bilinmeyen ayar bölümü: %', p_section using errcode = '22023';
  end if;

  if current_row.version <> p_expected_version then
    raise exception 'Ayarlar başka bir yönetici tarafından güncellendi. Sayfayı yenileyin.' using errcode = '40001';
  end if;

  select coalesce(array_agg(key order by key), '{}') into changed
  from (
    select key from jsonb_object_keys(current_row.value || p_value) as key
    where current_row.value -> key is distinct from p_value -> key
  ) changed_rows;

  update public.site_settings
  set value = p_value,
      version = current_row.version + 1,
      updated_by = p_changed_by,
      updated_by_label = p_changed_by_label,
      updated_at = now()
  where section = p_section
  returning * into saved_row;

  insert into public.site_setting_revisions (
    section, version, snapshot, changed_keys, changed_by, changed_by_label, restored_from_revision_id
  ) values (
    saved_row.section,
    saved_row.version,
    saved_row.value,
    changed,
    p_changed_by,
    p_changed_by_label,
    p_restored_from_revision_id
  );

  return saved_row;
end;
$$;

revoke execute on function public.save_site_settings(text, jsonb, integer, uuid, text, uuid) from public;
revoke execute on function public.save_site_settings(text, jsonb, integer, uuid, text, uuid) from anon;
revoke execute on function public.save_site_settings(text, jsonb, integer, uuid, text, uuid) from authenticated;
grant execute on function public.save_site_settings(text, jsonb, integer, uuid, text, uuid) to service_role;

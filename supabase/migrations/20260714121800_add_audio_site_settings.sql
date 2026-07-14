alter table public.site_settings
  drop constraint if exists site_settings_section_check;

alter table public.site_settings
  add constraint site_settings_section_check
  check (section in ('general', 'appearance', 'games', 'seo', 'ads', 'community', 'integrations', 'security', 'audio', 'system'));

insert into public.site_settings (section, value)
values ('audio', '{"clickSoundEnabled":true,"clickSoundUrl":"/sounds/click.mp3"}'::jsonb)
on conflict (section) do nothing;

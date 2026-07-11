create index if not exists site_settings_updated_by_idx on public.site_settings (updated_by);
create index if not exists site_setting_revisions_changed_by_idx on public.site_setting_revisions (changed_by);
create index if not exists site_setting_revisions_restored_from_idx on public.site_setting_revisions (restored_from_revision_id);

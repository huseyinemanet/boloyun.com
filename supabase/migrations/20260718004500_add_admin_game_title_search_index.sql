create index if not exists games_admin_title_trgm_idx
  on public.games using gin (title extensions.gin_trgm_ops);

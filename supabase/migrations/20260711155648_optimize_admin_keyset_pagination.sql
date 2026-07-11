create index if not exists games_updated_id_idx
  on public.games (updated_at desc, id desc);

create index if not exists game_imports_active_status_updated_id_idx
  on public.game_imports (updated_at desc, id desc)
  where import_status in ('scraped', 'ai_generated', 'pending_review', 'needs_fix', 'failed');

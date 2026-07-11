-- Keep the import ledger and all active review data, but remove duplicated heavy
-- payloads after a game has been published. Public games and R2 objects are not
-- touched by this migration.

update public.game_imports as import
set published_game_id = game.id
from public.games as game
where import.import_status = 'approved'
  and import.published_game_id is null
  and game.source_url = import.source_url;

create temporary table game_imports_compact
(like public.game_imports including defaults)
on commit drop;

-- Non-approved rows are part of an active/reviewable workflow and remain intact.
insert into game_imports_compact
select * from public.game_imports where import_status <> 'approved';

-- Approved rows become a lightweight source/duplicate/audit ledger.
insert into game_imports_compact (
  id,
  source_url,
  source_domain,
  original_title,
  thumbnail_url,
  detected_game_type,
  detected_embed_url,
  detected_swf_url,
  detected_html5_url,
  detected_external_url,
  ai_title_tr,
  import_status,
  error_message,
  created_at,
  updated_at,
  published_game_id
)
select
  id,
  source_url,
  source_domain,
  original_title,
  thumbnail_url,
  detected_game_type,
  detected_embed_url,
  detected_swf_url,
  detected_html5_url,
  detected_external_url,
  ai_title_tr,
  import_status,
  error_message,
  created_at,
  updated_at,
  published_game_id
from public.game_imports
where import_status = 'approved';

-- TRUNCATE releases the existing 1GB heap immediately; IDs and source URLs are
-- then restored from the compact staging table in the same transaction.
truncate table public.game_imports;
insert into public.game_imports select * from game_imports_compact;

create or replace function public.compact_completed_game_import()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.import_status = 'approved' then
    new.original_description := null;
    new.original_how_to_play := null;
    new.original_controls := null;
    new.original_developer := null;
    new.original_categories := null;
    new.original_tags := null;
    new.ai_short_description_tr := null;
    new.ai_long_description_tr := null;
    new.ai_how_to_play_tr := null;
    new.ai_controls_tr := null;
    new.ai_features_tr := null;
    new.ai_developer_tr := null;
    new.ai_seo_title_tr := null;
    new.ai_seo_description_tr := null;
    new.ai_categories_tr := null;
    new.ai_tags_tr := null;
    new.raw_html_snapshot := null;
  end if;
  return new;
end;
$$;

drop trigger if exists compact_completed_game_import_trigger on public.game_imports;
create trigger compact_completed_game_import_trigger
before insert or update of import_status on public.game_imports
for each row execute function public.compact_completed_game_import();

revoke execute on function public.compact_completed_game_import() from public, anon, authenticated;

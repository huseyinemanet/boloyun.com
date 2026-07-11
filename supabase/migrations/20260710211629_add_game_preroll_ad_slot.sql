insert into public.ad_slots (key, name, description, page_type, position, is_active, updated_at)
values ('game_preroll', 'Oyun açılış reklamı', 'Oyunu Başlat işleminden sonra oyun yüklenmeden önce gösterilir.', 'game', 'preroll', true, now())
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    page_type = excluded.page_type,
    position = excluded.position,
    updated_at = now();

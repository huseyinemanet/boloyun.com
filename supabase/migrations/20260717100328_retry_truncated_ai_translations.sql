update public.game_translation_state
set status = 'pending',
    attempts = 0,
    last_error = 'Yarım kalan JSON çıktısı düzeltmesinden sonra tekrar sıraya alındı.',
    updated_at = now()
where status = 'skipped'
  and last_error like '%Unterminated string in JSON%';

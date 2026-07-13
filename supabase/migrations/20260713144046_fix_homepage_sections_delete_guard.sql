create or replace function public.save_homepage_sections_atomic(p_sections jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_section jsonb;
begin
  if jsonb_typeof(p_sections) <> 'array' or jsonb_array_length(p_sections) > 100 then
    raise exception 'invalid homepage sections';
  end if;

  delete from public.homepage_sections where true;

  for v_section in select value from jsonb_array_elements(p_sections) loop
    insert into public.homepage_sections(
      id, title, section_type, source_type, source_id, manual_game_ids,
      limit_count, sort_order, visibility, status, updated_at
    ) values (
      coalesce(nullif(v_section->>'id', '')::uuid, gen_random_uuid()),
      v_section->>'title', v_section->>'section_type', nullif(v_section->>'source_type', ''),
      nullif(v_section->>'source_id', '')::uuid, coalesce(v_section->'manual_game_ids', '[]'::jsonb),
      (v_section->>'limit_count')::integer, (v_section->>'sort_order')::integer,
      v_section->>'visibility', v_section->>'status', clock_timestamp()
    );
  end loop;
end;
$$;

revoke execute on function public.save_homepage_sections_atomic(jsonb) from public, anon, authenticated;
grant execute on function public.save_homepage_sections_atomic(jsonb) to service_role;

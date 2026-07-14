drop function if exists public.save_appearance_and_homepage_atomic(jsonb, integer, uuid, text, jsonb);
drop function if exists public.save_site_settings(text, jsonb, integer, uuid, text, uuid);

drop table if exists public.site_setting_revisions cascade;

alter table public.site_settings
  drop column if exists version;

create or replace function public.save_site_settings(
  p_section text,
  p_value jsonb,
  p_changed_by uuid default null,
  p_changed_by_label text default null
)
returns public.site_settings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_row public.site_settings;
begin
  if jsonb_typeof(p_value) is distinct from 'object' then
    raise exception 'Ayar verisi JSON nesnesi olmalıdır.' using errcode = '22023';
  end if;

  update public.site_settings
  set value = p_value,
      updated_by = p_changed_by,
      updated_by_label = p_changed_by_label,
      updated_at = now()
  where section = p_section
  returning * into saved_row;

  if not found then
    raise exception 'Bilinmeyen ayar bölümü: %', p_section using errcode = '22023';
  end if;

  return saved_row;
end;
$$;

revoke execute on function public.save_site_settings(text, jsonb, uuid, text) from public;
revoke execute on function public.save_site_settings(text, jsonb, uuid, text) from anon;
revoke execute on function public.save_site_settings(text, jsonb, uuid, text) from authenticated;
grant execute on function public.save_site_settings(text, jsonb, uuid, text) to service_role;

create or replace function public.save_appearance_and_homepage_atomic(
  p_value jsonb,
  p_changed_by uuid,
  p_changed_by_label text,
  p_sections jsonb
)
returns setof public.site_settings
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query select * from public.save_site_settings(
    'appearance', p_value, p_changed_by, p_changed_by_label
  );
  perform public.save_homepage_sections_atomic(p_sections);
end;
$$;

revoke execute on function public.save_appearance_and_homepage_atomic(jsonb, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_appearance_and_homepage_atomic(jsonb, uuid, text, jsonb) to service_role;

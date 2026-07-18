update public.categories
set show_in_sidebar = false
where show_in_sidebar is distinct from false;

create or replace function public.get_public_shell_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'section', s.section,
            'value', s.value,
            'updated_at', s.updated_at,
            'updated_by_label', s.updated_by_label
          )
          order by s.section
        )
        from public.site_settings s
      ),
      '[]'::jsonb
    ),
    'categories', coalesce(
      (
        select jsonb_agg(to_jsonb(category_row) order by category_row.sidebar_sort_order, category_row.name, category_row.id)
        from (
          select
            c.id,
            c.name,
            c.slug,
            c.icon_svg,
            c.icon_url,
            c.sidebar_sort_order
          from public.categories c
          where c.status = 'active'
            and c.show_in_sidebar = true
          order by c.sidebar_sort_order asc, c.name asc, c.id asc
        ) category_row
      ),
      '[]'::jsonb
    ),
    'ads', coalesce(
      (
        select jsonb_agg(to_jsonb(ad_row) order by ad_row.slot_key)
        from (
          select
            slot.key as slot_key,
            selected_ad.id,
            selected_ad.name,
            selected_ad.ad_code,
            selected_ad.show_desktop,
            selected_ad.show_mobile
          from public.ad_slots slot
          cross join lateral (
            select a.*
            from public.ads a
            where a.slot_id = slot.id
              and a.is_active = true
              and (a.start_at is null or a.start_at <= statement_timestamp())
              and (a.end_at is null or a.end_at >= statement_timestamp())
            order by a.priority desc, a.updated_at desc
            limit 1
          ) selected_ad
          where slot.is_active = true
        ) ad_row
      ),
      '[]'::jsonb
    )
  );
$$;

revoke execute on function public.get_public_shell_snapshot() from public, anon, authenticated;
grant execute on function public.get_public_shell_snapshot() to service_role;

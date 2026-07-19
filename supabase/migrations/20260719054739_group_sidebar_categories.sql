with grouped_categories as (
  select
    id,
    row_number() over (
      order by coalesce(show_in_sidebar, false) desc, sidebar_sort_order asc, name asc, id asc
    ) - 1 as position
  from public.categories
)
update public.categories as category
set sidebar_sort_order = grouped_categories.position
from grouped_categories
where category.id = grouped_categories.id;

create or replace function public.reorder_categories(category_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  category_count integer;
  supplied_count integer;
  distinct_count integer;
begin
  select count(*)::integer
  into category_count
  from public.categories;

  supplied_count := coalesce(array_length(category_ids, 1), 0);

  select count(distinct supplied_id)::integer
  into distinct_count
  from unnest(category_ids) as supplied(supplied_id);

  if supplied_count <> category_count or distinct_count <> category_count then
    raise exception 'Kategori sırası tüm kategorileri tam olarak bir kez içermelidir.';
  end if;

  if exists (
    select 1
    from unnest(category_ids) as supplied(supplied_id)
    left join public.categories as category on category.id = supplied.supplied_id
    where category.id is null
  ) then
    raise exception 'Kategori sırasında bilinmeyen bir kategori var.';
  end if;

  with supplied_order as (
    select id, position
    from unnest(category_ids) with ordinality as supplied(id, position)
  ),
  grouped_order as (
    select
      category.id,
      row_number() over (
        order by coalesce(category.show_in_sidebar, false) desc, supplied_order.position asc
      ) - 1 as position
    from public.categories as category
    join supplied_order on supplied_order.id = category.id
  )
  update public.categories as category
  set
    sidebar_sort_order = grouped_order.position,
    updated_at = now()
  from grouped_order
  where category.id = grouped_order.id;
end;
$$;

create or replace function public.set_category_sidebar_visibility(
  target_category_id uuid,
  target_visible boolean
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_slug text;
begin
  perform 1
  from public.categories
  order by id
  for update;

  select slug
  into target_slug
  from public.categories
  where id = target_category_id;

  if not found then
    raise exception 'Kategori bulunamadı.';
  end if;

  update public.categories
  set
    show_in_sidebar = target_visible,
    updated_at = now()
  where id = target_category_id;

  with grouped_order as (
    select
      id,
      row_number() over (
        order by
          coalesce(show_in_sidebar, false) desc,
          case when target_visible and id = target_category_id then 1 else 0 end asc,
          sidebar_sort_order asc,
          name asc,
          id asc
      ) - 1 as position
    from public.categories
  )
  update public.categories as category
  set sidebar_sort_order = grouped_order.position
  from grouped_order
  where category.id = grouped_order.id;

  return target_slug;
end;
$$;

revoke all on function public.reorder_categories(uuid[]) from public;
revoke all on function public.reorder_categories(uuid[]) from anon;
revoke all on function public.reorder_categories(uuid[]) from authenticated;
grant execute on function public.reorder_categories(uuid[]) to service_role;

revoke all on function public.set_category_sidebar_visibility(uuid, boolean) from public;
revoke all on function public.set_category_sidebar_visibility(uuid, boolean) from anon;
revoke all on function public.set_category_sidebar_visibility(uuid, boolean) from authenticated;
grant execute on function public.set_category_sidebar_visibility(uuid, boolean) to service_role;

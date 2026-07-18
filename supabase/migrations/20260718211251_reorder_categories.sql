with ordered_categories as (
  select
    id,
    row_number() over (
      order by sidebar_sort_order asc, name asc, id asc
    ) - 1 as position
  from public.categories
)
update public.categories as category
set sidebar_sort_order = ordered_categories.position
from ordered_categories
where category.id = ordered_categories.id;

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

  update public.categories as category
  set
    sidebar_sort_order = ordered.position - 1,
    updated_at = now()
  from unnest(category_ids) with ordinality as ordered(id, position)
  where category.id = ordered.id;
end;
$$;

revoke all on function public.reorder_categories(uuid[]) from public;
revoke all on function public.reorder_categories(uuid[]) from anon;
revoke all on function public.reorder_categories(uuid[]) from authenticated;
grant execute on function public.reorder_categories(uuid[]) to service_role;

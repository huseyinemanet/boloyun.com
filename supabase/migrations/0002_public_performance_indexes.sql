create index if not exists games_published_created_at_idx
  on games (status, created_at desc);

create index if not exists categories_active_sort_name_idx
  on categories (status, sort_order, name);

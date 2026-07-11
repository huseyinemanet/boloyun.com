create table if not exists session_favorites (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  session_id text not null,
  created_at timestamptz default now(),
  unique (game_id, session_id)
);

create index if not exists session_favorites_session_idx
  on session_favorites (session_id, created_at desc);

alter table session_favorites enable row level security;

create table if not exists game_reactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  session_id text not null,
  vote text not null check (vote in ('like', 'dislike')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (game_id, session_id)
);

create index if not exists game_reactions_game_vote_idx
  on game_reactions (game_id, vote);

alter table game_reactions enable row level security;

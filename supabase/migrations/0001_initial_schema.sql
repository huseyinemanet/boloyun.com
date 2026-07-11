create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  level integer default 1,
  xp integer default 0,
  birth_year integer,
  terms_accepted_at timestamptz,
  marketing_emails_accepted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  short_description text,
  long_description text,
  how_to_play text,
  controls jsonb,
  features jsonb,
  developer text,
  release_date text,
  platform text,
  thumbnail_url text,
  game_type text not null check (game_type in ('iframe', 'swf', 'html5', 'external')),
  embed_url text,
  swf_url text,
  html5_url text,
  external_url text,
  source_url text,
  source_domain text,
  status text default 'draft' check (status in ('draft', 'published', 'inactive')),
  rating_avg numeric default 0,
  rating_count integer default 0,
  likes_count integer default 0,
  dislikes_count integer default 0,
  play_count integer default 0,
  current_players_count integer default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon_type text,
  icon_svg text,
  icon_url text,
  sort_order integer default 0,
  status text default 'active',
  seo_title text,
  seo_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  status text default 'active',
  seo_title text,
  seo_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table game_categories (
  game_id uuid references games(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (game_id, category_id)
);

create table game_tags (
  game_id uuid references games(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (game_id, tag_id)
);

create table game_imports (
  id uuid primary key default gen_random_uuid(),
  source_url text unique not null,
  source_domain text,
  original_title text,
  original_description text,
  original_how_to_play text,
  original_controls jsonb,
  original_developer text,
  original_categories jsonb,
  original_tags jsonb,
  thumbnail_url text,
  detected_game_type text,
  detected_embed_url text,
  detected_swf_url text,
  detected_html5_url text,
  detected_external_url text,
  ai_title_tr text,
  ai_short_description_tr text,
  ai_long_description_tr text,
  ai_how_to_play_tr text,
  ai_controls_tr jsonb,
  ai_features_tr jsonb,
  ai_developer_tr text,
  ai_seo_title_tr text,
  ai_seo_description_tr text,
  ai_categories_tr jsonb,
  ai_tags_tr jsonb,
  import_status text default 'discovered' check (import_status in ('discovered', 'scraped', 'ai_generated', 'pending_review', 'approved', 'rejected', 'failed', 'duplicate', 'needs_fix')),
  error_message text,
  raw_html_snapshot text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table homepage_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  section_type text not null,
  source_type text,
  source_id uuid,
  manual_game_ids jsonb,
  limit_count integer default 12,
  sort_order integer default 0,
  visibility text default 'all',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  body text not null,
  status text default 'pending',
  likes_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table favorites (
  user_id uuid references profiles(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, game_id)
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  rating integer,
  liked boolean,
  created_at timestamptz default now(),
  unique(user_id, game_id)
);

create table game_plays (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  user_id uuid references profiles(id),
  session_id text,
  last_played_at timestamptz default now(),
  play_count integer default 1,
  created_at timestamptz default now()
);

create table ad_slots (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  page_type text,
  position text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ads (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references ad_slots(id) on delete cascade,
  name text not null,
  ad_code text not null,
  is_active boolean default true,
  show_desktop boolean default true,
  show_mobile boolean default true,
  start_at timestamptz,
  end_at timestamptz,
  priority integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table static_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text,
  seo_title text,
  seo_description text,
  status text default 'published',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
alter table games enable row level security;
alter table categories enable row level security;
alter table tags enable row level security;
alter table game_categories enable row level security;
alter table game_tags enable row level security;
alter table game_imports enable row level security;
alter table homepage_sections enable row level security;
alter table comments enable row level security;
alter table favorites enable row level security;
alter table ratings enable row level security;
alter table game_plays enable row level security;
alter table ad_slots enable row level security;
alter table ads enable row level security;
alter table static_pages enable row level security;

create policy "published games are public" on games for select using (status = 'published');
create policy "active categories are public" on categories for select using (status = 'active');
create policy "active tags are public" on tags for select using (status = 'active');
create policy "public game categories" on game_categories for select using (true);
create policy "public game tags" on game_tags for select using (true);
create policy "published static pages are public" on static_pages for select using (status = 'published');

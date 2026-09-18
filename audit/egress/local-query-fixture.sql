-- LOCAL SYNTHETIC FIXTURE ONLY: never run against production.
create role anon; create role authenticated; create role service_role;
create table games(id uuid primary key, status text, created_at timestamptz);
create table categories(id uuid primary key); create table tags(id uuid primary key);
create table game_categories(game_id uuid,category_id uuid,primary key(game_id,category_id));
create table game_tags(game_id uuid,tag_id uuid,primary key(game_id,tag_id));
create index on game_categories(category_id,game_id); create index on game_tags(tag_id,game_id);
insert into games select md5(i::text)::uuid,'published',now()-make_interval(secs=>i) from generate_series(1,26000)i;
insert into categories select md5(i::text)::uuid from generate_series(1,100)i;
insert into tags select md5(i::text)::uuid from generate_series(1,1000)i;
insert into game_categories select md5(i::text)::uuid,md5(((i+j)%100+1)::text)::uuid from generate_series(1,26000)i cross join generate_series(1,6)j;
insert into game_tags select md5(i::text)::uuid,md5(((i+j)%1000+1)::text)::uuid from generate_series(1,26000)i cross join generate_series(1,10)j;
create index on games(created_at desc,id desc) where status='published';
grant select on all tables in schema public to anon,authenticated,service_role;
analyze;

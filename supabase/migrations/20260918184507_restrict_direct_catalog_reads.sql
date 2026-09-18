-- All catalogue reads in the application use the server service client.
-- RLS alone still permits an anonymous caller to download every published row.
-- Keep RLS/policies intact; block direct bulk reads through PostgREST/GraphQL.
-- No records, publication states, auth permissions or member writes change.
revoke select on table public.games, public.game_categories, public.game_tags,
  public.categories, public.tags from public, anon, authenticated;
grant select on table public.games, public.game_categories, public.game_tags,
  public.categories, public.tags to service_role;

create index if not exists games_published_likes_count_idx
  on public.games (likes_count desc, id desc)
  where status = 'published';

create index if not exists game_plays_last_played_at_idx
  on public.game_plays (last_played_at desc);

create or replace function public.get_admin_overview_snapshot(
  p_since_24_hours timestamptz,
  p_since_7_days timestamptz,
  p_popular_limit integer default 10
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
with
game_counts as (
  select
    count(*) filter (where status = 'published')::integer as published_games,
    count(*) filter (where is_broken is true)::integer as broken_games,
    count(*) filter (
      where thumbnail_sync_status in ('pending', 'failed', 'rolled_back')
    )::integer as cover_issues
  from public.games
),
import_counts as (
  select
    count(*) filter (
      where import_status in ('scraped', 'ai_generated', 'pending_review')
    )::integer as review_imports,
    count(*) filter (where import_status = 'needs_fix')::integer as needs_fix_imports,
    count(*) filter (where import_status = 'failed')::integer as failed_imports
  from public.game_imports
),
comment_counts as (
  select
    count(*)::integer as comments,
    count(*) filter (where status = 'pending')::integer as pending_comments
  from public.comments
),
profile_counts as (
  select count(*)::integer as profiles
  from public.profiles
),
play_counts as (
  select
    count(*) filter (where last_played_at >= p_since_24_hours)::integer as plays_24_hours,
    count(*) filter (where last_played_at >= p_since_7_days)::integer as plays_7_days
  from public.game_plays
  where last_played_at >= p_since_7_days
),
favorite_counts as (
  select game_id, count(*)::integer as favorite_count
  from public.favorites
  group by game_id
),
played_candidates as (
  select id
  from (
    select id
    from public.games
    where status = 'published'
    order by play_count desc, id desc
    limit 400
  ) candidates
),
liked_candidates as (
  select id
  from (
    select id
    from public.games
    where status = 'published'
    order by likes_count desc, id desc
    limit 400
  ) candidates
),
favorite_candidates as (
  select game_id as id
  from favorite_counts
  order by favorite_count desc, game_id
  limit 400
),
popular_candidate_ids as (
  select id from played_candidates
  union
  select id from liked_candidates
  union
  select id from favorite_candidates
),
popular_scored as (
  select
    g.id,
    g.title,
    g.slug,
    g.thumbnail_url,
    coalesce(primary_category.name, fallback_category.name, '') as category_name,
    coalesce(g.play_count, 0)::integer as play_count,
    coalesce(favorites.favorite_count, 0)::integer as favorite_count,
    coalesce(g.likes_count, 0)::integer as likes_count,
    coalesce(g.dislikes_count, 0)::integer as dislikes_count,
    coalesce(g.rating_avg, 0)::numeric as rating_avg,
    coalesce(g.rating_count, 0)::integer as rating_count,
    (
      coalesce(g.play_count, 0)
      + coalesce(favorites.favorite_count, 0) * 60
      + coalesce(g.likes_count, 0) * 25
      + coalesce(g.rating_count, 0) * 8
      + coalesce(g.rating_avg, 0) * 5
      - coalesce(g.dislikes_count, 0) * 15
    )::numeric as popularity_score
  from popular_candidate_ids candidates
  join public.games g on g.id = candidates.id
  left join favorite_counts favorites on favorites.game_id = g.id
  left join public.categories primary_category on primary_category.id = g.primary_category_id
  left join lateral (
    select category.name
    from public.game_categories game_category
    join public.categories category on category.id = game_category.category_id
    where game_category.game_id = g.id
    order by category.name
    limit 1
  ) fallback_category on primary_category.id is null
),
popular_games as (
  select *
  from popular_scored
  order by popularity_score desc, play_count desc, title
  limit greatest(1, least(coalesce(p_popular_limit, 10), 20))
),
popular_payload as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'slug', slug,
        'categoryName', category_name,
        'thumbnailUrl', thumbnail_url,
        'playCount', play_count,
        'favoriteCount', favorite_count,
        'likesCount', likes_count,
        'dislikesCount', dislikes_count,
        'ratingAvg', rating_avg,
        'ratingCount', rating_count,
        'popularityScore', popularity_score
      )
      order by popularity_score desc, play_count desc, title
    ),
    '[]'::jsonb
  ) as games
  from popular_games
),
recent_audit_rows as (
  select
    audit.id,
    audit.action,
    audit.target_type,
    audit.details,
    audit.created_at,
    case
      when profile.id is null then null
      else jsonb_build_object(
        'username', profile.username,
        'avatar_url', profile.avatar_url,
        'display_name', profile.display_name,
        'first_name', profile.first_name,
        'last_name', profile.last_name
      )
    end as profile
  from public.admin_audit_events audit
  left join public.profiles profile on profile.id = audit.actor_profile_id
  order by audit.created_at desc
  limit 5
),
activity_payload as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'action', action,
        'target_type', target_type,
        'details', details,
        'created_at', created_at,
        'profiles', profile
      )
      order by created_at desc
    ),
    '[]'::jsonb
  ) as activities
  from recent_audit_rows
)
select jsonb_build_object(
  'totals', jsonb_build_object(
    'games', game_counts.published_games,
    'categories', (select count(*)::integer from public.categories),
    'comments', comment_counts.comments,
    'users', profile_counts.profiles
  ),
  'performance', jsonb_build_object(
    'plays24Hours', play_counts.plays_24_hours,
    'plays7Days', play_counts.plays_7_days
  ),
  'attention', jsonb_build_object(
    'reviewImports', import_counts.review_imports,
    'needsFixImports', import_counts.needs_fix_imports,
    'failedImports', import_counts.failed_imports,
    'brokenGames', game_counts.broken_games,
    'coverIssues', game_counts.cover_issues,
    'pendingComments', comment_counts.pending_comments
  ),
  'activities', activity_payload.activities,
  'popularGames', popular_payload.games
)
from game_counts
cross join import_counts
cross join comment_counts
cross join profile_counts
cross join play_counts
cross join popular_payload
cross join activity_payload;
$function$;

revoke all on function public.get_admin_overview_snapshot(timestamptz, timestamptz, integer) from public;
revoke all on function public.get_admin_overview_snapshot(timestamptz, timestamptz, integer) from anon;
revoke all on function public.get_admin_overview_snapshot(timestamptz, timestamptz, integer) from authenticated;
grant execute on function public.get_admin_overview_snapshot(timestamptz, timestamptz, integer) to service_role;

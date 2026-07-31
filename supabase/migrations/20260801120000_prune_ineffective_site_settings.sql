update public.site_settings as games
set value = jsonb_set(
  jsonb_set(
    games.value,
    '{likesEnabled}',
    to_jsonb(
      coalesce((games.value ->> 'likesEnabled')::boolean, true)
      and coalesce((community.value ->> 'ratingsEnabled')::boolean, true)
    ),
    true
  ),
  '{favoritesEnabled}',
  to_jsonb(
    coalesce((games.value ->> 'favoritesEnabled')::boolean, true)
    and coalesce((community.value ->> 'favoritesEnabled')::boolean, true)
  ),
  true
)
from public.site_settings as community
where games.section = 'games'
  and community.section = 'community';

update public.site_settings
set value = value - 'logoUrl'
where section = 'general';

update public.site_settings
set value = value
  - 'thumbnailWidth'
  - 'thumbnailHeight'
  - 'thumbnailCrop'
  - 'mediumMaxWidth'
  - 'mediumMaxHeight'
  - 'largeMaxWidth'
  - 'largeMaxHeight'
  - 'defaultCoverUrl'
where section = 'media';

update public.site_settings
set value = value - 'redirectLegacyUrls'
where section = 'permalinks';

update public.site_settings
set value = value - 'ratingsEnabled' - 'favoritesEnabled'
where section = 'community';

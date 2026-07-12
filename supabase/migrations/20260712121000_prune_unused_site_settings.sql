update public.site_settings
set value = value - 'tagline' - 'description' - 'contactEmail' - 'locale' - 'timezone' - 'defaultCoverUrl'
where section = 'general';

update public.site_settings
set value = value - 'emailVerificationRequired'
where section = 'community';

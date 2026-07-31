update public.site_settings
set value = value - 'registrationsEnabled'
where section = 'general';

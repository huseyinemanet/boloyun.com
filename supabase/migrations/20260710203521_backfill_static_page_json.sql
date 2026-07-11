update static_pages
set content_json = content::jsonb
where content_json is null
  and content is not null
  and content <> '';

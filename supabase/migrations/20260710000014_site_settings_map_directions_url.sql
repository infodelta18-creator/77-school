begin;

alter table public.site_settings
  add column if not exists map_directions_url text;

commit;

begin;

alter table public.site_settings enable row level security;

grant select on table public.site_settings to anon;
grant select, insert, update on table public.site_settings to authenticated;

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
  on public.site_settings for insert
  with check (public.has_any_role(array['super_admin', 'admin']));

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update
  using (public.has_any_role(array['super_admin', 'admin']))
  with check (public.has_any_role(array['super_admin', 'admin']));

commit;

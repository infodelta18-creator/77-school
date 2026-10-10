begin;

create or replace function public.has_any_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.is_suspended = false
      and p.role = any(roles)
  );
$$;

grant execute on function public.has_any_role(text[]) to anon;
grant execute on function public.has_any_role(text[]) to authenticated;

grant select on table public.news to anon;
grant select, insert, update, delete on table public.news to authenticated;
grant select on table public.announcements to anon;
grant select, insert, update, delete on table public.announcements to authenticated;
grant select on table public.documents to anon;
grant select, insert, update, delete on table public.documents to authenticated;
grant select on table public.gallery_albums to anon;
grant select on table public.gallery_images to anon;
grant select, insert, update, delete on table public.gallery_albums to authenticated;
grant select, insert, update, delete on table public.gallery_images to authenticated;
grant select on table public.teachers to anon;
grant select, insert, update, delete on table public.teachers to authenticated;
grant select on table public.leadership to anon;
grant select, insert, update, delete on table public.leadership to authenticated;
grant select on table public.site_settings to anon;
grant select, update on table public.site_settings to authenticated;

drop policy if exists "Authenticated staff can manage news" on public.news;
create policy "Authenticated staff can manage news"
  on public.news for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

drop policy if exists "Authenticated staff can manage announcements" on public.announcements;
create policy "Authenticated staff can manage announcements"
  on public.announcements for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

drop policy if exists "Authenticated staff can manage documents" on public.documents;
create policy "Authenticated staff can manage documents"
  on public.documents for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

drop policy if exists "Authenticated staff can manage gallery content" on public.gallery_albums;
create policy "Authenticated staff can manage gallery content"
  on public.gallery_albums for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

drop policy if exists "Authenticated staff can manage gallery images" on public.gallery_images;
create policy "Authenticated staff can manage gallery images"
  on public.gallery_images for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

drop policy if exists "Authenticated staff can manage teachers" on public.teachers;
create policy "Authenticated staff can manage teachers"
  on public.teachers for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

drop policy if exists "Authenticated staff can manage leadership" on public.leadership;
create policy "Authenticated staff can manage leadership"
  on public.leadership for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update
  using (public.has_any_role(array['super_admin', 'admin']))
  with check (public.has_any_role(array['super_admin', 'admin']));

drop policy if exists "Staff can upload news images" on storage.objects;
create policy "Staff can upload news images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'news-images'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

drop policy if exists "Staff can update news images" on storage.objects;
create policy "Staff can update news images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'news-images'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  )
  with check (
    bucket_id = 'news-images'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

drop policy if exists "Staff can delete news images" on storage.objects;
create policy "Staff can delete news images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'news-images'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

drop policy if exists "Staff can upload documents files" on storage.objects;
create policy "Staff can upload documents files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

drop policy if exists "Staff can update documents files" on storage.objects;
create policy "Staff can update documents files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documents'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  )
  with check (
    bucket_id = 'documents'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

drop policy if exists "Staff can delete documents files" on storage.objects;
create policy "Staff can delete documents files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

drop policy if exists "Staff can upload gallery images files" on storage.objects;
create policy "Staff can upload gallery images files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gallery-images'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

drop policy if exists "Staff can update gallery images files" on storage.objects;
create policy "Staff can update gallery images files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'gallery-images'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  )
  with check (
    bucket_id = 'gallery-images'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

drop policy if exists "Staff can delete gallery images files" on storage.objects;
create policy "Staff can delete gallery images files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gallery-images'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

commit;

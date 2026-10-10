begin;

-- Keep RLS enabled; grants only allow PostgREST roles to reach table policies.
grant select on table public.gallery_albums to anon;
grant select on table public.gallery_images to anon;
grant select, insert, update, delete on table public.gallery_albums to authenticated;
grant select, insert, update, delete on table public.gallery_images to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-images',
  'gallery-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read gallery images files" on storage.objects;
create policy "Public can read gallery images files"
  on storage.objects
  for select
  to public
  using (bucket_id = 'gallery-images');

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

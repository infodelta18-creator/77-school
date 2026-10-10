begin;

alter table public.news
  add column if not exists external_link text,
  add column if not exists external_link_label text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-images',
  'news-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read news images" on storage.objects;
create policy "Public can read news images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'news-images');

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

commit;

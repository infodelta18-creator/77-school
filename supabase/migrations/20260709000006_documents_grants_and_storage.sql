begin;

-- Keep RLS enabled; grants only allow PostgREST roles to reach table policies.
grant select on table public.documents to anon;
grant select, insert, update, delete on table public.documents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read documents files" on storage.objects;
create policy "Public can read documents files"
  on storage.objects
  for select
  to public
  using (bucket_id = 'documents');

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

commit;

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reception-attachments',
  'reception-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Staff can read reception attachments files" on storage.objects;
create policy "Staff can read reception attachments files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'reception-attachments'
    and public.has_any_role(array['super_admin', 'admin', 'editor'])
  );

commit;

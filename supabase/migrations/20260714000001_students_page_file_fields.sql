begin;

alter table public.students_page_content
  add column if not exists file_url text,
  add column if not exists file_name text;

commit;

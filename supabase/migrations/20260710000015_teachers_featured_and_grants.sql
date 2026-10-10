begin;

alter table public.teachers
  add column if not exists is_featured boolean not null default false;

grant select on table public.teachers to anon;
grant select, insert, update, delete on table public.teachers to authenticated;

commit;

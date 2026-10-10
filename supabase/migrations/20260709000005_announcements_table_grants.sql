begin;

-- Keep RLS enabled; grants only allow PostgREST roles to reach table policies.
grant select on table public.announcements to anon;
grant select, insert, update, delete on table public.announcements to authenticated;

commit;

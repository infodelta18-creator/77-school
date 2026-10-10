begin;

-- Keep RLS enabled; grant only the table privilege needed for admin reads.
grant select on table public.contact_messages to authenticated;

commit;

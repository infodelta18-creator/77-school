begin;

-- Edge Function inserts and returns id/created_at from contact_messages.
-- Grant only the minimum required table privileges to service_role.
grant insert, select on table public.contact_messages to service_role;

commit;

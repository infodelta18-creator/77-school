begin;

-- Edge Function inserts and returns id/created_at/request_number from reception_requests.
grant insert, select on table public.reception_requests to service_role;

commit;

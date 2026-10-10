begin;

-- Keep RLS as the gatekeeper; grant table privileges needed for PostgREST roles.
grant select on table public.news to anon;
grant select, insert, update, delete on table public.news to authenticated;

grant select on table public.news_categories to anon;
grant select, insert, update, delete on table public.news_categories to authenticated;

commit;

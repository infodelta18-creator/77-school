begin;

-- Function: create a profiles row for every new auth.users insertion.
-- SECURITY DEFINER so it can write to public.profiles regardless of RLS.
-- search_path is pinned to prevent search_path injection attacks.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    'editor'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger: fires after each new row in auth.users.
-- Drop first to make the migration idempotent on re-runs.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;

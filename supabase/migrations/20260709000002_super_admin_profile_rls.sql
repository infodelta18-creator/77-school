begin;

drop policy if exists "Super admins can view all profiles" on public.profiles;
drop policy if exists "Super admins can update other profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Super admins can view all profiles"
  on public.profiles
  for select
  using (public.has_any_role(array['super_admin']));

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      role in ('admin', 'editor')
      or (public.has_any_role(array['super_admin']) and role = 'super_admin')
    )
  );

create policy "Super admins can update other profiles"
  on public.profiles
  for update
  using (public.has_any_role(array['super_admin']) and auth.uid() <> id)
  with check (role in ('admin', 'editor'));

commit;
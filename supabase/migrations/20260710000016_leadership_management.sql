begin;

create table if not exists public.leadership (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  position text not null,
  photo_url text,
  phone text,
  email text,
  reception_days text,
  biography text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_leadership_updated_at on public.leadership;
create trigger trg_leadership_updated_at
before update on public.leadership
for each row execute function public.set_updated_at();

alter table public.leadership enable row level security;

drop policy if exists "Public can read active leadership" on public.leadership;
create policy "Public can read active leadership"
  on public.leadership for select
  using (is_active = true);

drop policy if exists "Authenticated staff can manage leadership" on public.leadership;
create policy "Authenticated staff can manage leadership"
  on public.leadership for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

grant select on table public.leadership to anon;
grant select, insert, update, delete on table public.leadership to authenticated;

commit;

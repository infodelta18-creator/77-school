create table if not exists public.parents_page_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  text text not null,
  icon_name text not null default 'UserCheck',
  file_url text,
  file_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parents_page_content enable row level security;

create policy if not exists parents_page_content_select_public
  on public.parents_page_content
  for select
  using (true);

create policy if not exists parents_page_content_manage_admin
  on public.parents_page_content
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'admin', 'editor')
    )
  );

drop trigger if exists parents_page_content_set_updated_at on public.parents_page_content;

create trigger parents_page_content_set_updated_at
before update on public.parents_page_content
for each row
execute function update_updated_at_column();

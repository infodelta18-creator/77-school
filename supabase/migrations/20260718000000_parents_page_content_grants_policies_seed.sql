begin;

create table if not exists public.parents_page_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  text text not null,
  icon_name text not null default 'UserCheck',
  sort_order integer not null default 0,
  file_name text,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parents_page_content
  add column if not exists file_name text,
  add column if not exists file_url text;

alter table public.parents_page_content enable row level security;

grant select on table public.parents_page_content to anon;
grant select, insert, update, delete on table public.parents_page_content to authenticated;

drop policy if exists parents_page_content_select_public on public.parents_page_content;
create policy parents_page_content_select_public
  on public.parents_page_content
  for select
  using (true);

drop policy if exists parents_page_content_manage_admin on public.parents_page_content;
create policy parents_page_content_manage_admin
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

insert into public.parents_page_content (title, text, icon_name, sort_order)
select
  seed.title,
  seed.text,
  seed.icon_name,
  seed.sort_order
from (
  values
    ('Ota-onalar uchun qo''llanma', 'Ta''lim jarayonida ota-ona sifatida siz bilishingiz kerak bo''lgan ma''lumotlar.', 'UserCheck', 0),
    ('Qabul tartibi', '1-sinfga qabul jarayoni va bosqichlari haqida to''liq ma''lumot.', 'ClipboardList', 1),
    ('Kerakli hujjatlar', 'Qabul uchun taqdim etilishi zarur bo''lgan hujjatlar ro''yxati.', 'FileText', 2),
    ('Ota-onalar yig''ilishi', 'Yig''ilishlar jadvali va kun tartibi.', 'Users', 3),
    ('Maktab formasi', 'Rasmiy maktab formasi talablari va tavsiyalar.', 'Shirt', 4),
    ('Bolalar xavfsizligi', 'Bola xavfsizligi bo''yicha maslahatlar va qoidalar.', 'ShieldCheck', 5)
) as seed(title, text, icon_name, sort_order)
where not exists (
  select 1
  from public.parents_page_content existing
  where lower(existing.title) = lower(seed.title)
);

commit;

begin;

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  organization_name text not null,
  organization_short_name text,
  organization_type text,
  director_name text,
  phone text,
  email text,
  address text,
  working_hours text,
  telegram_url text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  map_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select
  using (true);

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update
  using (public.has_any_role(array['super_admin', 'admin']))
  with check (public.has_any_role(array['super_admin', 'admin']));

grant select on table public.site_settings to anon;
grant select, update on table public.site_settings to authenticated;

insert into public.site_settings (
  id,
  organization_name,
  organization_short_name,
  organization_type,
  director_name,
  phone,
  email,
  address,
  working_hours,
  telegram_url,
  instagram_url,
  facebook_url,
  youtube_url,
  map_url
)
values (
  1,
  '41-sonli umumiy o''rta ta''lim maktabi',
  '41-maktab',
  'umumiy o''rta ta''lim maktabi',
  'Abdullayev Anvar Akmalovich',
  '+998 71 000-00-00',
  'info@41maktab.uz',
  'Toshkent shahri, Chilonzor tumani',
  'Dushanba – Shanba, 08:00 – 18:00',
  'https://t.me/',
  'https://instagram.com/',
  'https://facebook.com/',
  'https://youtube.com/',
  'https://www.openstreetmap.org/export/embed.html?bbox=69.20%2C41.28%2C69.30%2C41.32&layer=mapnik'
)
on conflict (id) do nothing;

commit;

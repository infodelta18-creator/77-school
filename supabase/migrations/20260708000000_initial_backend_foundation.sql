begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('super_admin', 'admin', 'editor')),
  is_active boolean not null default true,
  is_suspended boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  featured_image text,
  category_id uuid references public.news_categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null,
  importance text not null default 'normal' check (importance in ('normal', 'important', 'critical')),
  start_date timestamptz,
  expiration_date timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  attachment_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  photo_url text,
  subject text,
  department text,
  experience_years integer,
  qualification text,
  biography text,
  achievements text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  file_url text not null,
  file_type text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_image text,
  event_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  subject text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.reception_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  full_name text not null,
  phone text not null,
  email text,
  request_type text,
  subject text not null,
  message text not null,
  attachment_url text,
  status text not null default 'new',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.has_any_role(roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.is_suspended = false
      and p.role = any(roles)
  );
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_news_updated_at
before update on public.news
for each row execute function public.set_updated_at();

create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create trigger trg_teachers_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger trg_gallery_albums_updated_at
before update on public.gallery_albums
for each row execute function public.set_updated_at();

create trigger trg_reception_requests_updated_at
before update on public.reception_requests
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.news_categories enable row level security;
alter table public.news enable row level security;
alter table public.announcements enable row level security;
alter table public.teachers enable row level security;
alter table public.documents enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_images enable row level security;
alter table public.contact_messages enable row level security;
alter table public.reception_requests enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Authenticated staff can manage profiles"
  on public.profiles for insert
  with check (public.has_any_role(array['super_admin', 'admin']));

create policy "Public can read published news"
  on public.news for select
  using (status = 'published' and (published_at is null or published_at <= now()));

create policy "Authenticated staff can manage news"
  on public.news for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Public can read published announcements"
  on public.announcements for select
  using (status = 'published' and (start_date is null or start_date <= now()) and (expiration_date is null or expiration_date >= now()));

create policy "Authenticated staff can manage announcements"
  on public.announcements for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Public can read active teachers"
  on public.teachers for select
  using (is_active = true);

create policy "Authenticated staff can manage teachers"
  on public.teachers for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Public can read published documents"
  on public.documents for select
  using (status = 'published' and (published_at is null or published_at <= now()));

create policy "Authenticated staff can manage documents"
  on public.documents for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Public can read gallery albums"
  on public.gallery_albums for select
  using (true);

create policy "Public can read gallery images"
  on public.gallery_images for select
  using (true);

create policy "Authenticated staff can manage gallery content"
  on public.gallery_albums for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Authenticated staff can manage gallery images"
  on public.gallery_images for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Public can submit contact messages"
  on public.contact_messages for insert
  with check (true);

create policy "Staff can read contact messages"
  on public.contact_messages for select
  using (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Public can submit reception requests"
  on public.reception_requests for insert
  with check (true);

create policy "Staff can read reception requests"
  on public.reception_requests for select
  using (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Authenticated staff can manage categories"
  on public.news_categories for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

create policy "Public can read categories"
  on public.news_categories for select
  using (true);

commit;

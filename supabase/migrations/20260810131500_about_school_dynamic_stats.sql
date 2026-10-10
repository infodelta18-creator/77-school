begin;

-- Create dynamic stats table extending about_school
create table if not exists public.about_school_stats (
  id uuid primary key default gen_random_uuid(),
  about_id smallint not null default 1 references public.about_school(id) on delete cascade,
  icon text not null default 'award',
  value text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Trigger for updated_at
drop trigger if exists trg_about_school_stats_updated_at on public.about_school_stats;
create trigger trg_about_school_stats_updated_at
before update on public.about_school_stats
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.about_school_stats enable row level security;

-- Policies
drop policy if exists "Public can read about school stats" on public.about_school_stats;
create policy "Public can read about school stats"
  on public.about_school_stats for select
  using (true);

drop policy if exists "Staff can manage about school stats" on public.about_school_stats;
create policy "Staff can manage about school stats"
  on public.about_school_stats for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

-- Grants
grant select on table public.about_school_stats to anon;
grant select, insert, update, delete on table public.about_school_stats to authenticated;

-- Seed default statistics matching school passport
insert into public.about_school_stats (about_id, icon, value, label, sort_order, is_active)
values
  (1, 'calendar', '1981', 'Tashkil etilgan yil', 1, true),
  (1, 'building', '880', 'O‘quvchilar o‘rni', 2, true),
  (1, 'user-check', '41', 'O‘qituvchilar soni', 3, true),
  (1, 'door-open', '25', 'Sinflar soni', 4, true)
on conflict do nothing;

-- Update about_school singleton row 1 with official text
update public.about_school
set
  title_uz = 'Maktab haqida',
  history_title_uz = 'Maktab tarixi',
  history_text_uz = '215-sonli umumiy o‘rta ta’lim maktabi Toshkent shahri Yashnobod tumanida joylashgan bo‘lib, o‘tgan yillar mobaynida minglab yosh avlod vakillariga bilim va tarbiya berib kelmoqda. Maktab zamonaviy o‘quv jarayoni, malakali pedagog kadrlar hamda mustahkam moddiy-texnik baza bilan ta’minlangan. Bugungi kunda maktabimizda umumiy o‘rta ta’limning amaldagi standartlariga muvofiq ta’lim tashkil etilgan. O‘quvchilar aniq va tabiiy fanlar, xorijiy tillar, informatika hamda san’at yo‘nalishlarida chuqurlashtirilgan bilim oladilar.',
  founded_year = 1981,
  students_count = 880,
  teachers_count = 41,
  classrooms_count = 25
where id = 1;

commit;

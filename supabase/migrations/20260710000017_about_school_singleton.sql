begin;

create table if not exists public.about_school (
  id smallint primary key default 1 check (id = 1),
  title_uz text,
  intro_uz text,
  history_title_uz text,
  history_text_uz text,
  mission_title_uz text,
  mission_text_uz text,
  vision_title_uz text,
  vision_text_uz text,
  title_ru text,
  intro_ru text,
  history_title_ru text,
  history_text_ru text,
  mission_title_ru text,
  mission_text_ru text,
  vision_title_ru text,
  vision_text_ru text,
  title_en text,
  intro_en text,
  history_title_en text,
  history_text_en text,
  mission_title_en text,
  mission_text_en text,
  vision_title_en text,
  vision_text_en text,
  founded_year integer,
  students_count integer,
  teachers_count integer,
  classrooms_count integer,
  main_image_url text,
  secondary_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_about_school_updated_at on public.about_school;
create trigger trg_about_school_updated_at
before update on public.about_school
for each row execute function public.set_updated_at();

alter table public.about_school enable row level security;

drop policy if exists "Public can read about school" on public.about_school;
create policy "Public can read about school"
  on public.about_school for select
  using (true);

drop policy if exists "Staff can manage about school" on public.about_school;
create policy "Staff can manage about school"
  on public.about_school for all
  using (public.has_any_role(array['super_admin', 'admin', 'editor']))
  with check (public.has_any_role(array['super_admin', 'admin', 'editor']));

grant select on table public.about_school to anon;
grant select, insert, update, delete on table public.about_school to authenticated;

insert into public.about_school (
  id,
  title_uz,
  intro_uz,
  history_title_uz,
  history_text_uz,
  mission_title_uz,
  mission_text_uz,
  vision_title_uz,
  vision_text_uz,
  founded_year,
  students_count,
  teachers_count,
  classrooms_count
)
values (
  1,
  'Maktab haqida',
  '41-sonli umumiy o‘rta ta’lim maktabi — bilim va tarbiya maskani sifatida zamonaviy ta’lim tamoyillari asosida faoliyat yuritadi.',
  'Maktab tarixi',
  '41-sonli umumiy o‘rta ta’lim maktabi Toshkent shahri Chilonzor tumanida joylashgan bo‘lib, o‘tgan yillar mobaynida minglab yosh avlod vakillariga bilim va tarbiya berib kelmoqda. Maktab zamonaviy o‘quv jarayoni, malakali pedagog kadrlar hamda mustahkam moddiy-texnik baza bilan ta’minlangan. Bugungi kunda maktabimizda umumiy o‘rta ta’limning barcha davlat ta’lim standartlariga muvofiq ta’lim tashkil etilgan. O‘quvchilar aniq va tabiiy fanlar, xorijiy tillar, informatika hamda san’at yo‘nalishlarida chuqurlashtirilgan bilim oladilar.',
  'Missiya',
  'Har bir o‘quvchiga sifatli, zamonaviy va inson qadr-qimmatini hurmat qiluvchi ta’lim berish.',
  'Vizyon',
  'Ilm-ma’rifat, milliy qadriyatlar va zamonaviy texnologiyalar uyg‘unlashgan yetakchi maktab bo‘lish.',
  1975,
  1260,
  78,
  32
)
on conflict (id) do nothing;

commit;

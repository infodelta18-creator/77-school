import { supabase } from "./supabase";

export type AboutSchoolRow = {
  id: number;
  title_uz?: string | null;
  intro_uz?: string | null;
  history_label_uz?: string | null;
  history_title_uz?: string | null;
  history_text_uz?: string | null;
  mission_title_uz?: string | null;
  mission_text_uz?: string | null;
  vision_title_uz?: string | null;
  vision_text_uz?: string | null;
  infrastructure_text_uz?: string | null;
  title_ru?: string | null;
  intro_ru?: string | null;
  history_label_ru?: string | null;
  history_title_ru?: string | null;
  history_text_ru?: string | null;
  mission_title_ru?: string | null;
  mission_text_ru?: string | null;
  vision_title_ru?: string | null;
  vision_text_ru?: string | null;
  title_en?: string | null;
  intro_en?: string | null;
  history_label_en?: string | null;
  history_title_en?: string | null;
  history_text_en?: string | null;
  mission_title_en?: string | null;
  mission_text_en?: string | null;
  vision_title_en?: string | null;
  vision_text_en?: string | null;
  founded_year?: number | null;
  students_count?: number | null;
  teachers_count?: number | null;
  classrooms_count?: number | null;
  main_image_url?: string | null;
  secondary_image_url?: string | null;
  updated_at?: string;
};

export type AboutSchoolStatRow = {
  id: string;
  about_id: number;
  icon: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  updated_by?: string | null;
};

export const ABOUT_SCHOOL_SELECT = "*";

export const DEFAULT_ABOUT_PASSPORT = {
  founded_year: 1981,
  students_count: 880,
  teachers_count: 41,
  classrooms_count: 25,
};

export const DEFAULT_DYNAMIC_STATS: AboutSchoolStatRow[] = [
  { id: "stat-1", about_id: 1, icon: "calendar", value: "1981", label: "Tashkil etilgan yil", sort_order: 1, is_active: true },
  { id: "stat-2", about_id: 1, icon: "building", value: "880", label: "O‘quvchilar o‘rni", sort_order: 2, is_active: true },
  { id: "stat-3", about_id: 1, icon: "user-check", value: "41", label: "O‘qituvchilar soni", sort_order: 3, is_active: true },
  { id: "stat-4", about_id: 1, icon: "door-open", value: "25", label: "Sinflar soni", sort_order: 4, is_active: true },
];

export async function fetchAboutSchoolStats(): Promise<AboutSchoolStatRow[]> {
  try {
    const { data, error } = await supabase
      .from("about_school_stats")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as AboutSchoolStatRow[];
    }
  } catch (err) {
    console.warn("Could not fetch about_school_stats, trying about_school fallback:", err);
  }

  try {
    const { data: about, error: aboutErr } = await supabase
      .from("about_school")
      .select("founded_year, students_count, teachers_count, classrooms_count")
      .eq("id", 1)
      .maybeSingle();

    if (!aboutErr && about) {
      return [
        { id: "stat-1", about_id: 1, icon: "calendar", value: String(about.founded_year ?? 1981), label: "Tashkil etilgan yil", sort_order: 1, is_active: true },
        { id: "stat-2", about_id: 1, icon: "building", value: String(about.students_count ?? 880), label: "O‘quvchilar o‘rni", sort_order: 2, is_active: true },
        { id: "stat-3", about_id: 1, icon: "user-check", value: String(about.teachers_count ?? 41), label: "O‘qituvchilar soni", sort_order: 3, is_active: true },
        { id: "stat-4", about_id: 1, icon: "door-open", value: String(about.classrooms_count ?? 25), label: "Sinflar soni", sort_order: 4, is_active: true },
      ];
    }
  } catch (err) {
    console.warn("Could not fetch about_school row 1 fallback:", err);
  }

  return DEFAULT_DYNAMIC_STATS;
}

function getObjectPathFromPublicUrl(publicUrl: string) {
  try {
    const parsed = new URL(publicUrl);
    const marker = "/storage/v1/object/public/news-images/";
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) {
      return null;
    }

    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path || null;
  } catch {
    return null;
  }
}

export function getAboutImageObjectPath(publicUrl: string | null | undefined) {
  const path = getObjectPathFromPublicUrl((publicUrl ?? "").trim());
  if (!path) {
    return null;
  }

  if (!path.startsWith("about/")) {
    return null;
  }

  return path;
}
